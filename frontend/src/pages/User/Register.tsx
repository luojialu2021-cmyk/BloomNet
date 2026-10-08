import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, UserPlus, Phone, MapPin } from 'lucide-react';
import { useOwnerAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../api/config';
import { validateAddress, validateAddressWithGeocoding } from '../../utils/addressValidation';

export default function UserRegister() {
  const navigate = useNavigate();
  const { user, isAuthenticated, token, isLoading: authLoading } = useOwnerAuth();
  
  const [formData, setFormData] = useState({
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'MD',
    zipcode: '',
    bio: '',
    preferred_plant_types: [] as string[],
  });

  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const loadExistingProfile = useCallback(async () => {
    if (!token) {
      setDataLoading(false);
      return;
    }
    
    setDataLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const profileData = await response.json();
        if (profileData.is_complete) {
          // User has existing profile, populate form and set edit mode
          setIsEditMode(true);
          setFormData({
            phone: profileData.phone || '',
            address_line1: profileData.address_line1 || '',
            address_line2: profileData.address_line2 || '',
            city: profileData.city || '',
            state: profileData.state || 'MD',
            zipcode: profileData.zipcode || '',
            bio: profileData.bio || '',
            preferred_plant_types: profileData.preferred_plant_types || [],
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setDataLoading(false);
    }
  }, [token]);

  // Redirect if not authenticated
  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      // Load existing profile data if user is already registered
      loadExistingProfile();
    }
  }, [isAuthenticated, authLoading, navigate, loadExistingProfile]);

  const plantTypeOptions = [
    'succulent',
    'cactus',
    'fern',
    'flower',
    'herb',
    'other',
  ];

  const usStates = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'DC', label: 'District of Columbia' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const togglePlantType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      preferred_plant_types: prev.preferred_plant_types.includes(type)
        ? prev.preferred_plant_types.filter(t => t !== type)
        : [...prev.preferred_plant_types, type]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    
    // Validate address fields using validation utility
    const addressErrors = validateAddress({
      address_line1: formData.address_line1,
      address_line2: formData.address_line2,
      city: formData.city,
      state: formData.state,
      zipcode: formData.zipcode,
    });
    
    // Filter out undefined values and convert to Record<string, string>
    Object.keys(addressErrors).forEach(key => {
      const value = addressErrors[key];
      if (value) {
        newErrors[key] = value;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // First, do basic format validation
    if (!validateForm()) return;

    setLoading(true);

    try {
        // Then, validate address with geocoding API (checks if city/state/zipcode are consistent)
        const geocodingValidation = await validateAddressWithGeocoding({
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          zipcode: formData.zipcode,
        }, API_BASE_URL);

        if (!geocodingValidation.isValid) {
          // Add geocoding validation errors to form errors
          if (geocodingValidation.errors) {
            // Filter out undefined values and convert to Record<string, string>
            const filteredErrors: Record<string, string> = {};
            Object.keys(geocodingValidation.errors).forEach(key => {
              const value = geocodingValidation.errors![key];
              if (value) {
                filteredErrors[key] = value;
              }
            });
            // Debug: log errors to see what's being set
            console.log('Geocoding validation errors (User Register):', filteredErrors);
            setErrors(prev => ({ ...prev, ...filteredErrors }));
          } else {
            // If no specific field errors, try to determine field from message
            const message = geocodingValidation.message.toLowerCase();
            if (message.includes("city")) {
              setErrors(prev => ({ ...prev, city: geocodingValidation.message }));
            } else if (message.includes("state")) {
              setErrors(prev => ({ ...prev, state: geocodingValidation.message }));
            } else if (message.includes("zip")) {
              setErrors(prev => ({ ...prev, zipcode: geocodingValidation.message }));
            } else {
              // Default to address_line1 for address-related errors
              setErrors(prev => ({ ...prev, address_line1: geocodingValidation.message }));
            }
          }
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/user/profile`, {
            method: isEditMode ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            if (response.status === 422) {
                const data = await response.json();
                const newErrors: Record<string, string> = {};
                data.detail.forEach((detail: any) => {
                    const field = detail.loc[1];
                    newErrors[field] = detail.msg;
                });
                setErrors(newErrors);
            } else {
                throw new Error('Failed to save profile');
            }
        } else {
            navigate('/dashboard');
        }
    } catch (error: any) {
        console.error('Registration error:', error);
        setErrors({ submit: error.message || 'Failed to complete registration' });
    } finally {
        setLoading(false);
    }
};

  if (authLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-emerald-600 border-t-transparent animate-spin"></div>
          <p className="text-gray-600">
            {authLoading ? 'Loading authentication...' : 'Loading your profile...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen px-4 py-12 bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Leaf className="w-10 h-10 text-emerald-600" />
            <span className="text-3xl font-bold text-gray-900">BloomNet</span>
          </Link>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Your Profile' : 'Complete Your Profile'}
          </h1>
          <p className="text-gray-600">
            {isEditMode 
              ? 'Update your account information' 
              : `Welcome, ${user.name}! Let's set up your account.`
            }
          </p>
        </div>

        {/* Form Card */}
        <div className="p-8 bg-white border shadow-xl rounded-2xl border-emerald-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {errors.submit && (
              <div className="p-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl">
                {errors.submit}
              </div>
            )}

            {/* Contact Information */}
            <div>
              <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900">
                <Phone className="w-5 h-5 text-emerald-600" />
                Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="(123) 456-7890"
                    required
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Location
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="address_line1" className="block mb-2 text-sm font-medium text-gray-700">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="address_line1"
                    name="address_line1"
                    value={formData.address_line1}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.address_line1 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 123 Main Street, 456 Oak Ave"
                    required
                  />
                  {errors.address_line1 && <p className="mt-1 text-sm text-red-600">{errors.address_line1}</p>}
                </div>

                <div>
                  <label htmlFor="address_line2" className="block mb-2 text-sm font-medium text-gray-700">
                    Apt, Suite, etc. (Optional)
                  </label>
                  <input
                    type="text"
                    id="address_line2"
                    name="address_line2"
                    value={formData.address_line2}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.address_line2 ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Apt 4B, Suite 200, Unit 5"
                  />
                  {errors.address_line2 && <p className="mt-1 text-sm text-red-600">{errors.address_line2}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block mb-2 text-sm font-medium text-gray-700">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Baltimore, St. Louis"
                      required
                    />
                    {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                  </div>

                  <div>
                    <label htmlFor="state" className="block mb-2 text-sm font-medium text-gray-700">
                      State *
                    </label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      {usStates.map(state => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                    {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="zipcode" className="block mb-2 text-sm font-medium text-gray-700">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    id="zipcode"
                    name="zipcode"
                    value={formData.zipcode}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      errors.zipcode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 12345 or 12345-6789"
                    maxLength={10}
                    required
                  />
                  {errors.zipcode && <p className="mt-1 text-sm text-red-600">{errors.zipcode}</p>}
                </div>
              </div>
            </div>

            {/* Plant Interests */}
            <div>
              <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900">
                <Leaf className="w-5 h-5 text-emerald-600" />
                Plant Interests
              </h3>
              <p className="mb-3 text-sm text-gray-600">What types of plants do you need care for?</p>
              <div className="flex flex-wrap gap-2">
                {plantTypeOptions.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => togglePlantType(type)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      formData.preferred_plant_types.includes(type)
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bio (Optional) */}
            <div>
              <label htmlFor="bio" className="block mb-2 text-sm font-medium text-gray-700">
                Tell Us About Your Plants (Optional)
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Tell us about your plant collection and care needs..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full gap-2 px-6 py-4 text-lg font-semibold text-white transition-all shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-5 h-5" />
              {loading 
                ? (isEditMode ? 'Updating Profile...' : 'Completing Registration...') 
                : (isEditMode ? 'Update Profile' : 'Complete Registration')
              }
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 transition-colors hover:text-emerald-600"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
