"""
Address validation endpoint using geocoding API
Validates that city, state, and zipcode are consistent and the address exists
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# US State abbreviations to full names mapping
STATE_ABBREV_TO_NAME = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
}

# Reverse mapping: full name to abbreviation
STATE_NAME_TO_ABBREV = {v.upper(): k for k, v in STATE_ABBREV_TO_NAME.items()}


class AddressValidationRequest(BaseModel):
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    zipcode: str


class AddressValidationResponse(BaseModel):
    is_valid: bool
    message: str
    verified_city: Optional[str] = None
    verified_state: Optional[str] = None
    verified_zipcode: Optional[str] = None
    confidence: Optional[str] = None  # "high", "medium", "low"


async def validate_address_with_geocoding(
    address_line1: str,
    city: str,
    state: str,
    zipcode: str,
    address_line2: Optional[str] = None
) -> AddressValidationResponse:
    """
    Validate address using OpenStreetMap Nominatim API (free, no API key required)
    """
    try:
        # Build full address string (ignore address_line2 completely)
        address_parts = [address_line1, city, state, zipcode]
        full_address = ", ".join(address_parts)
        
        # Call OpenStreetMap Nominatim API
        # Rate limit: 1 request per second (we'll add a small delay if needed)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": full_address,
            "format": "json",
            "addressdetails": 1,
            "limit": 1,
            "countrycodes": "us"  # Limit to US addresses
        }
        headers = {
            "User-Agent": "BloomNet-PlantCare/1.0"  # Required by Nominatim
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params, headers=headers)
            
            if response.status_code != 200:
                logger.warning(f"Geocoding API returned status {response.status_code}")
                return AddressValidationResponse(
                    is_valid=False,
                    message="Unable to verify address at this time. Please check your address and try again.",
                    confidence="low"
                )
            
            data = response.json()
            
            if not data or len(data) == 0:
                # Build full address string for error message (ignore address_line2)
                full_address_parts = []
                if address_line1:
                    full_address_parts.append(f"'{address_line1}'")
                full_address_parts.append(f"'{city}'")
                full_address_parts.append(f"'{state}'")
                full_address_parts.append(zipcode)
                full_address_str = ", ".join(full_address_parts)
                
                return AddressValidationResponse(
                    is_valid=False,
                    message=f"Address not found. Please verify that {full_address_str} is correct.",
                    confidence="low"
                )
            
            # Extract address components from geocoding result
            result = data[0]
            address_details = result.get("address", {})
            
            verified_city = address_details.get("city") or address_details.get("town") or address_details.get("village")
            verified_state = address_details.get("state")
            verified_zipcode = address_details.get("postcode")
            
            # Check if street address exists in the result
            # OpenStreetMap returns house_number and road for valid street addresses
            verified_house_number = address_details.get("house_number")
            verified_road = address_details.get("road") or address_details.get("street")
            has_street_address = bool(verified_house_number and verified_road)
            
            # Check the match type/class from API result
            # "place" or "postcode" means it only matched city/zipcode, not a specific address
            result_type = result.get("type", "")
            result_class = result.get("class", "")
            is_specific_address = result_class in ["place", "building", "house", "address"] or \
                                 (result_type and "address" in result_type.lower())
            
            # Normalize city names for comparison (case-insensitive, remove extra spaces)
            normalized_input_city = city.strip().lower()
            normalized_verified_city = verified_city.lower() if verified_city else ""
            
            # Check if city matches (allow partial matches for common variations)
            city_match = False
            if verified_city:
                # Exact match or contains match
                if normalized_input_city == normalized_verified_city:
                    city_match = True
                elif normalized_verified_city.startswith(normalized_input_city) or \
                     normalized_input_city.startswith(normalized_verified_city.split()[0]):
                    # Partial match (e.g., "Baltimore" matches "Baltimore City")
                    city_match = True
            elif not verified_city and city.strip():
                # API didn't return a city, but user provided one - this is a mismatch
                # This means the address might exist but city is wrong
                city_match = False
            
            # Check state match (handle both abbreviations and full names)
            # Convert both input and verified state to abbreviations for comparison
            input_state_upper = state.upper()
            verified_state_upper = (verified_state or "").upper()
            
            state_match = False
            if verified_state_upper:
                # Convert input to abbreviation
                if input_state_upper in STATE_NAME_TO_ABBREV:
                    # Input is full name, convert to abbreviation
                    input_abbrev = STATE_NAME_TO_ABBREV[input_state_upper]
                elif input_state_upper in STATE_ABBREV_TO_NAME:
                    # Input is already abbreviation
                    input_abbrev = input_state_upper
                else:
                    # Unknown format, try direct match
                    input_abbrev = input_state_upper
                
                # Convert verified to abbreviation
                if verified_state_upper in STATE_NAME_TO_ABBREV:
                    # Verified is full name, convert to abbreviation
                    verified_abbrev = STATE_NAME_TO_ABBREV[verified_state_upper]
                elif verified_state_upper in STATE_ABBREV_TO_NAME:
                    # Verified is already abbreviation
                    verified_abbrev = verified_state_upper
                else:
                    # Unknown format, try direct match
                    verified_abbrev = verified_state_upper
                
                # Compare abbreviations (or direct match if conversion failed)
                state_match = (input_abbrev == verified_abbrev) or (input_state_upper == verified_state_upper)
            
            # Check zipcode match (compare first 5 digits)
            zipcode_match = False
            if verified_zipcode:
                input_zip = zipcode.split("-")[0]  # Get first 5 digits
                verified_zip = verified_zipcode.split("-")[0]
                zipcode_match = input_zip == verified_zip
            
            # Determine validation result
            # Check city match first (before checking street address)
            # If city doesn't match, prioritize that error
            if not city_match and verified_city:
                # City doesn't match - this is a city error, not a street address error
                return AddressValidationResponse(
                    is_valid=False,
                    message=f"City '{city}' does not match the verified city '{verified_city}'. Please check your city name.",
                    verified_city=verified_city,
                    verified_state=verified_state,
                    verified_zipcode=verified_zipcode,
                    confidence="low"
                )
            elif not city_match and not verified_city and city.strip():
                # User provided a city, but API didn't return one - city might be wrong
                return AddressValidationResponse(
                    is_valid=False,
                    message=f"City '{city}' could not be verified. Please check your city name.",
                    verified_city=None,
                    verified_state=verified_state,
                    verified_zipcode=verified_zipcode,
                    confidence="low"
                )
            
            # Check state match
            if not state_match and verified_state:
                return AddressValidationResponse(
                    is_valid=False,
                    message=f"State '{state}' does not match the verified state '{verified_state}'. Please check your state.",
                    verified_city=verified_city,
                    verified_state=verified_state,
                    verified_zipcode=verified_zipcode,
                    confidence="low"
                )
            
            # Now check if street address exists (after city/state validation)
            if not has_street_address and (result_class == "place" or result_type == "postcode"):
                # API only matched city/zipcode, not a specific street address
                # Build full address string for error message (ignore address_line2)
                full_address_parts = []
                if address_line1:
                    full_address_parts.append(f"'{address_line1}'")
                full_address_parts.append(f"'{city}'")
                full_address_parts.append(f"'{state}'")
                full_address_parts.append(zipcode)
                full_address_str = ", ".join(full_address_parts)
                
                return AddressValidationResponse(
                    is_valid=False,
                    message=f"Street address not found. Please verify that {full_address_str} is correct, especially the street name and number.",
                    verified_city=verified_city,
                    verified_state=verified_state,
                    verified_zipcode=verified_zipcode,
                    confidence="low"
                )
            
            if city_match and state_match and zipcode_match:
                if has_street_address:
                    return AddressValidationResponse(
                        is_valid=True,
                        message="Address verified successfully.",
                        verified_city=verified_city,
                        verified_state=verified_state,
                        verified_zipcode=verified_zipcode,
                        confidence="high"
                    )
                else:
                    # City/state/zipcode match but no specific street address found
                    # Build full address string for error message (ignore address_line2)
                    full_address_parts = []
                    if address_line1:
                        full_address_parts.append(f"'{address_line1}'")
                    full_address_parts.append(f"'{city}'")
                    full_address_parts.append(f"'{state}'")
                    full_address_parts.append(zipcode)
                    full_address_str = ", ".join(full_address_parts)
                    
                    return AddressValidationResponse(
                        is_valid=False,
                        message=f"Street address not found. Please verify that {full_address_str} is correct, especially the street name and number. City, state, and ZIP code appear to be correct.",
                        verified_city=verified_city,
                        verified_state=verified_state,
                        verified_zipcode=verified_zipcode,
                        confidence="low"
                    )
            elif city_match and state_match:
                # City and state match, but zipcode might be different (could be valid)
                return AddressValidationResponse(
                    is_valid=True,
                    message=f"Address verified. Note: ZIP code {verified_zipcode or zipcode} may differ slightly.",
                    verified_city=verified_city,
                    verified_state=verified_state,
                    verified_zipcode=verified_zipcode or zipcode,
                    confidence="medium"
                )
            # City and state matches are already checked above, so we shouldn't reach here
            # But keep this as fallback
            elif not city_match:
                return AddressValidationResponse(
                    is_valid=False,
                    message=f"City '{city}' does not match the verified city '{verified_city or 'unknown'}'. Please check your city name.",
                    verified_city=verified_city,
                    verified_state=verified_state,
                    verified_zipcode=verified_zipcode,
                    confidence="low"
                )
            elif not state_match:
                return AddressValidationResponse(
                    is_valid=False,
                    message=f"State '{state}' does not match the verified state '{verified_state or 'unknown'}'. Please check your state.",
                    verified_city=verified_city,
                    verified_state=verified_state,
                    verified_zipcode=verified_zipcode,
                    confidence="low"
                )
            else:
                return AddressValidationResponse(
                    is_valid=False,
                    message="Address components do not match. Please verify city, state, and ZIP code.",
                    verified_city=verified_city,
                    verified_state=verified_state,
                    verified_zipcode=verified_zipcode,
                    confidence="low"
                )
                
    except httpx.TimeoutException:
        logger.error("Geocoding API timeout")
        return AddressValidationResponse(
            is_valid=False,
            message="Address verification timed out. Please try again later.",
            confidence="low"
        )
    except Exception as e:
        logger.error(f"Error validating address: {e}")
        return AddressValidationResponse(
            is_valid=False,
            message="Unable to verify address at this time. Please check your address manually.",
            confidence="low"
        )


@router.post("/validate", response_model=AddressValidationResponse)
async def validate_address(request: AddressValidationRequest):
    """
    Validate address using geocoding API
    Checks if city, state, and zipcode are consistent and the address exists
    """
    return await validate_address_with_geocoding(
        address_line1=request.address_line1,
        address_line2=request.address_line2,
        city=request.city,
        state=request.state,
        zipcode=request.zipcode
    )

