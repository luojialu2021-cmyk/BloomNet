"""
Address validation utilities for user and sitter profiles.
Provides reusable validation functions that match frontend validation rules.
"""
import re
from typing import Optional

# Valid US state abbreviations
US_STATES = {
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
}


def validate_address_line1(value: str) -> str:
    """
    Validate street address line 1.
    
    Requirements:
    - Must not be empty
    - Minimum 5 characters
    - Maximum 100 characters
    - Must contain at least one digit (house/building number)
    - Must contain at least one letter (street name)
    - Allowed characters: letters, numbers, spaces, hyphens, periods, commas, apostrophes
    
    Args:
        value: Street address string
        
    Returns:
        Normalized address string (trimmed)
        
    Raises:
        ValueError: If address format is invalid
    """
    if not value:
        raise ValueError("Street address is required")
    
    value = value.strip()
    
    if len(value) < 5:
        raise ValueError("Street address must be at least 5 characters")
    
    if len(value) > 100:
        raise ValueError("Street address must be 100 characters or less")
    
    # Check for number (house/building number)
    if not re.search(r'\d', value):
        raise ValueError("Street address must contain a house/building number")
    
    # Check for letter (street name)
    if not re.search(r'[A-Za-z]', value):
        raise ValueError("Street address must contain a street name")
    
    # Check for valid characters
    if not re.match(r"^[A-Za-z0-9\s\-\.,']+$", value):
        raise ValueError("Street address contains invalid characters")
    
    return value


def validate_address_line2(value: Optional[str]) -> Optional[str]:
    """
    Validate optional address line 2 (apartment, suite, etc.).
    
    Requirements:
    - If provided, must be non-empty
    - Minimum 2 characters if provided
    - Maximum 50 characters
    - Allowed characters: letters, numbers, spaces, hyphens, periods, commas, #, /
    
    Args:
        value: Optional address line 2 string
        
    Returns:
        Normalized address line 2 string (trimmed) or None
        
    Raises:
        ValueError: If address format is invalid
    """
    if value is None:
        return None
    
    value = value.strip()
    
    if not value:
        return None
    
    if len(value) < 2:
        raise ValueError("Address line 2 must be at least 2 characters if provided")
    
    if len(value) > 50:
        raise ValueError("Address line 2 must be 50 characters or less")
    
    # Check for valid characters
    if not re.match(r"^[A-Za-z0-9\s\-\.,#/]+$", value):
        raise ValueError("Address line 2 contains invalid characters")
    
    return value


def validate_city(value: str) -> str:
    """
    Validate city name.
    
    Requirements:
    - Must not be empty
    - Minimum 2 characters
    - Maximum 50 characters
    - Should contain only letters, spaces, hyphens, apostrophes, periods
    - First letter should be capitalized (normalized)
    
    Args:
        value: City name string
        
    Returns:
        Normalized city name (capitalized, trimmed)
        
    Raises:
        ValueError: If city format is invalid
    """
    if not value:
        raise ValueError("City is required")
    
    value = value.strip()
    
    if len(value) < 2:
        raise ValueError("City name must be at least 2 characters")
    
    if len(value) > 50:
        raise ValueError("City name must be 50 characters or less")
    
    # Check for valid characters (letters, spaces, hyphens, apostrophes, periods)
    # Allow periods for abbreviations like "St.", "Mt.", "Ft."
    if not re.match(r"^[A-Za-z][A-Za-z\s\-'.]+$", value):
        raise ValueError("City name contains invalid characters (letters, spaces, hyphens, apostrophes, and periods only)")
    
    # Normalize: capitalize first letter of each word
    return ' '.join(word.capitalize() for word in value.split())


def validate_state(value: str) -> str:
    """
    Validate US state abbreviation.
    
    Requirements:
    - Must be exactly 2 uppercase letters
    - Must be a valid US state abbreviation
    
    Args:
        value: State abbreviation string
        
    Returns:
        Normalized state abbreviation (uppercase, trimmed)
        
    Raises:
        ValueError: If state format is invalid
    """
    if not value:
        raise ValueError("State is required")
    
    value = value.strip().upper()
    
    # Check format (2 uppercase letters)
    if not re.match(r"^[A-Z]{2}$", value):
        raise ValueError("State must be a 2-letter abbreviation")
    
    # Check if valid US state
    if value not in US_STATES:
        raise ValueError(f"'{value}' is not a valid US state abbreviation")
    
    return value


def validate_zipcode(value: str) -> str:
    """
    Validate US ZIP code format.
    
    Requirements:
    - Must be 5 digits or 9 digits with hyphen (e.g., 21218 or 21218-1234)
    
    Args:
        value: ZIP code string
        
    Returns:
        Normalized ZIP code (trimmed)
        
    Raises:
        ValueError: If ZIP code format is invalid
    """
    if not value:
        raise ValueError("ZIP code is required")
    
    value = value.strip()
    
    # Check format (5 digits or 9 digits with hyphen)
    if not re.match(r"^\d{5}(-\d{4})?$", value):
        raise ValueError("ZIP code must be 5 digits or 9 digits with hyphen (e.g., 21218 or 21218-1234)")
    
    return value

