/**
 * Frontend address validation utilities
 * Matches backend validation rules in backend/app/utils/address_validator.py
 */

export interface AddressValidationErrors extends Record<string, string | undefined> {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

export function validateAddressLine1(value: string): string | null {
  if (!value || !value.trim()) {
    return 'Street address is required';
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length < 5) {
    return 'Street address must be at least 5 characters';
  }
  
  if (trimmed.length > 100) {
    return 'Street address must be 100 characters or less';
  }
  
  // Must contain at least one digit (house/building number)
  if (!/\d/.test(trimmed)) {
    return 'Street address must contain a house/building number';
  }
  
  // Must contain at least one letter (street name)
  if (!/[a-zA-Z]/.test(trimmed)) {
    return 'Street address must contain a street name';
  }
  
  // Check for valid characters
  if (!/^[a-zA-Z0-9\s\-.,'#]+$/.test(trimmed)) {
    return 'Street address contains invalid characters';
  }
  
  return null;
}

export function validateAddressLine2(value: string): string | null {
  if (!value || !value.trim()) {
    return null; // Optional field
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length < 2) {
    return 'Address line 2 must be at least 2 characters if provided';
  }
  
  if (trimmed.length > 50) {
    return 'Address line 2 must be 50 characters or less';
  }
  
  // Check for valid characters
  if (!/^[a-zA-Z0-9\s\-.,'#/]+$/.test(trimmed)) {
    return 'Address line 2 contains invalid characters';
  }
  
  return null;
}

export function validateCity(value: string): string | null {
  if (!value || !value.trim()) {
    return 'City is required';
  }
  
  const trimmed = value.trim();
  
  if (trimmed.length < 2) {
    return 'City name must be at least 2 characters';
  }
  
  if (trimmed.length > 50) {
    return 'City name must be 50 characters or less';
  }
  
  // Check for valid characters (letters, spaces, hyphens, apostrophes, periods)
  if (!/^[A-Za-z][A-Za-z\s\-'.]+$/.test(trimmed)) {
    return 'City name contains invalid characters. Only letters, spaces, hyphens, apostrophes, and periods are allowed';
  }
  
  return null;
}

export function validateState(value: string): string | null {
  if (!value || !value.trim()) {
    return 'State is required';
  }
  
  const trimmed = value.trim().toUpperCase();
  
  if (!US_STATES.has(trimmed)) {
    return 'Invalid US state abbreviation';
  }
  
  return null;
}

export function validateZipcode(value: string): string | null {
  if (!value || !value.trim()) {
    return 'ZIP code is required';
  }
  
  const trimmed = value.trim();
  
  // Must be 5 digits or 9 digits with hyphen (12345 or 12345-6789)
  if (!/^\d{5}(-\d{4})?$/.test(trimmed)) {
    return 'Invalid ZIP code format. Must be 5 digits (e.g., 12345) or 9 digits with hyphen (e.g., 12345-6789)';
  }
  
  return null;
}

export function validateAddress(address: {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}): AddressValidationErrors {
  const errors: AddressValidationErrors = {};
  
  const addressLine1Error = validateAddressLine1(address.address_line1 || '');
  if (addressLine1Error) errors.address_line1 = addressLine1Error;
  
  // address_line2 is completely optional, no validation needed
  
  const cityError = validateCity(address.city || '');
  if (cityError) errors.city = cityError;
  
  const stateError = validateState(address.state || '');
  if (stateError) errors.state = stateError;
  
  const zipcodeError = validateZipcode(address.zipcode || '');
  if (zipcodeError) errors.zipcode = zipcodeError;
  
  return errors;
}

/**
 * Validate address using geocoding API
 * This performs a more thorough validation by checking if the address actually exists
 * and if city, state, and zipcode are consistent
 */
export async function validateAddressWithGeocoding(
  address: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zipcode: string;
  },
  apiBaseUrl: string = '/api/v1'
): Promise<{ isValid: boolean; message: string; errors?: AddressValidationErrors }> {
  try {
    const response = await fetch(`${apiBaseUrl}/address/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_line1: address.address_line1,
        address_line2: address.address_line2 || null,
        city: address.city,
        state: address.state,
        zipcode: address.zipcode,
      }),
    });

    if (!response.ok) {
      return {
        isValid: false,
        message: 'Unable to verify address at this time. Please check your address manually.',
      };
    }

    const data = await response.json();
    console.log('[AddressValidation] API response:', data);
    
    if (data.is_valid) {
      return {
        isValid: true,
        message: data.message || 'Address verified successfully.',
      };
    } else {
      // Create errors object with the validation message
      const errors: AddressValidationErrors = {};
      
      // Check for specific error types and map to appropriate fields
      // Priority: Check for specific field errors first (City, State, ZIP)
      // Then check for street address errors
      // Order matters: check more specific errors first
      
      const message = data.message || '';
      const messageLower = message.toLowerCase();
      
      // Check for City errors (case-insensitive)
      // Look for "City" (capitalized) or "city" (lowercase) in the message
      if (message.includes("City") || messageLower.includes("city")) {
        // City-related errors (e.g., "City 'X' does not match", "city could not be verified")
        errors.city = message;
        console.log('[AddressValidation] Mapped to city field:', message);
      }
      // Check for State errors
      else if (message.includes("State") || messageLower.includes("state")) {
        // State-related errors (e.g., "State 'X' does not match")
        errors.state = message;
        console.log('[AddressValidation] Mapped to state field:', message);
      }
      // Check for ZIP code errors
      else if (message.includes("ZIP") || messageLower.includes("zipcode") || messageLower.includes("zip code")) {
        // ZIP code-related errors
        errors.zipcode = message;
        console.log('[AddressValidation] Mapped to zipcode field:', message);
      }
      // Check for Street address errors (but not city/state/zip errors)
      else if ((message.includes("Street address") || messageLower.includes("street address")) && 
               !messageLower.includes("city") && !messageLower.includes("state") && !messageLower.includes("zip")) {
        // Street address-related errors (but not city/state/zip errors)
        errors.address_line1 = message;
        console.log('[AddressValidation] Mapped to address_line1 field:', message);
      }
      // Check for general "Address not found" (but not city/state/zip errors)
      else if (messageLower.includes("address not found") && 
               !messageLower.includes("city") && !messageLower.includes("state") && !messageLower.includes("zip")) {
        // General "Address not found" (when API returns empty)
        errors.address_line1 = message;
        console.log('[AddressValidation] Mapped to address_line1 field (not found):', message);
      }
      // Check for other address-related errors (but not city/state/zip errors)
      else if (messageLower.includes("address") && 
               !messageLower.includes("city") && !messageLower.includes("state") && !messageLower.includes("zip")) {
        // Other address-related errors (but not city/state/zip)
        errors.address_line1 = message;
        console.log('[AddressValidation] Mapped to address_line1 field (general):', message);
      }
      // Fallback: if message doesn't clearly indicate a field, show in address_line1
      else {
        errors.address_line1 = message;
        console.log('[AddressValidation] Mapped to address_line1 field (fallback):', message);
      }
      
      console.log('[AddressValidation] Final errors object:', errors);
      
      return {
        isValid: false,
        message: message,
        errors,
      };
    }
  } catch (error) {
    console.error('Address validation error:', error);
    return {
      isValid: false,
      message: 'Unable to verify address at this time. Please check your address manually.',
    };
  }
}

