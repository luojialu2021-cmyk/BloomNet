import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Save } from 'lucide-react';
import { useSitterAuth } from '../../contexts/AuthContext';
import SitterAppHeader from '../../components/SitterAppHeader';
import { API_BASE_URL } from '../../api/config';
import { validateAddressWithGeocoding } from '../../utils/addressValidation';
import { validateAddress } from '../../utils/addressValidation';

const plantTypeOptions = [
  'succulent',
  'cactus',
  'fern',
  'flower',
  'herb',
  'tropical',
  'bonsai',
  'other',
];

const campusAreaOptions = [
  'Homewood',
  'East Baltimore',
  'Peabody',
  'Other',
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

type PricingValue = number | "";

interface SitterProfileForm {
  name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zipcode: string;
  campus_area: string;
  bio: string;
  tagline: string;
  specialties: string[];
  years_experience: number;
  price_per_visit: PricingValue;
  price_per_day: PricingValue;
  price_per_week: PricingValue;
  service_radius_miles: number;
  service_areas: string[];
  is_complete: boolean;
}

const defaultProfile: SitterProfileForm = {
  name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: 'MD',
  zipcode: '',
  campus_area: '',
  bio: '',
  tagline: '',
  specialties: [] as string[],
  years_experience: 0,
  price_per_visit: 0,
  price_per_day: 0,
  price_per_week: 0,
  service_radius_miles: 5,
  service_areas: [] as string[],
  is_complete: false,
};

export default function SitterProfileNew() {
  const navigate = useNavigate();
  const { user, isAuthenticated, token, isLoading: authLoading } = useSitterAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [profile, setProfile] = useState(defaultProfile);
  const [editForm, setEditForm] = useState(defaultProfile);

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/sitter/login');
      return;
    }
    
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, navigate, token]);

  const loadProfile = async () => {
    if (!token) {
      console.log('No token available');
      setLoading(false);
      return;
    }
    
    console.log('Loading sitter profile with user:', user?.email, 'user_id:', user?.user_id);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sitter/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded sitter profile:', data.email, 'is_complete:', data.is_complete);
        const normalized = {
          ...defaultProfile,
          ...data,
          specialties: data.specialties || [],
          service_areas: data.service_areas || [],
          service_radius_miles: data.service_radius_miles ?? defaultProfile.service_radius_miles,
        };
        setProfile(normalized);
        setEditForm(normalized);
      } else {
        console.error('Failed to load profile:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate address fields before submitting
    const addressErrors = validateAddress({
      address_line1: editForm.address_line1,
      address_line2: editForm.address_line2,
      city: editForm.city,
      state: editForm.state,
      zipcode: editForm.zipcode,
    });
    
    if (Object.keys(addressErrors).length > 0) {
      // Filter out undefined values and convert to Record<string, string>
      const filteredErrors: Record<string, string> = {};
      Object.keys(addressErrors).forEach(key => {
        const value = addressErrors[key];
        if (value) {
          filteredErrors[key] = value;
        }
      });
      setErrors(filteredErrors);
      return;
    }
    
    setSaving(true);
    setErrors({}); // Clear previous errors
    try {
        // Validate address with geocoding API (checks if city/state/zipcode are consistent)
        const geocodingValidation = await validateAddressWithGeocoding({
          address_line1: editForm.address_line1,
          address_line2: editForm.address_line2,
          city: editForm.city,
          state: editForm.state,
          zipcode: editForm.zipcode,
        }, API_BASE_URL);

        if (!geocodingValidation.isValid) {
          // Add geocoding validation errors to form errors
          if (geocodingValidation.errors) {
            const filteredErrors: Record<string, string> = {};
            Object.keys(geocodingValidation.errors).forEach(key => {
              const value = geocodingValidation.errors![key];
              if (value) {
                filteredErrors[key] = value;
              }
            });
            // Debug: log errors to see what's being set
            console.log('Geocoding validation errors:', filteredErrors);
            setErrors(filteredErrors);
          } else {
            // If no specific field errors, try to determine field from message
            const message = geocodingValidation.message.toLowerCase();
            if (message.includes("city")) {
              setErrors({ city: geocodingValidation.message });
            } else if (message.includes("state")) {
              setErrors({ state: geocodingValidation.message });
            } else if (message.includes("zip")) {
              setErrors({ zipcode: geocodingValidation.message });
            } else {
              // Default to address_line1 for address-related errors
              setErrors({ address_line1: geocodingValidation.message });
            }
          }
          setSaving(false);
          return;
        }
        // Auto-generate service_areas from zipcode
        const zipcode = editForm.zipcode?.split('-')[0]; // Extract 5-digit ZIP
        const autoServiceAreas = zipcode ? [zipcode] : [];
        
        const parsePricingValue = (value: number | string) => {
            if (value === "" || value === null || value === undefined) {
                return 0;
            }
            if (typeof value === "number") {
                return value;
            }
            const parsed = Number(value);
            return Number.isNaN(parsed) ? 0 : parsed;
        };

        const payload = {
            ...editForm,
            price_per_visit: parsePricingValue(editForm.price_per_visit),
            price_per_day: parsePricingValue(editForm.price_per_day),
            price_per_week: parsePricingValue(editForm.price_per_week),
            // service_areas will be auto-generated from zipcode on backend
            // Don't send service_areas in payload - backend will handle it
        };

        const response = await fetch(`${API_BASE_URL}/sitter/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            if (response.status === 422) {
                const errorData = await response.json();
                const newErrors: Record<string, string> = {};
                errorData.detail.forEach((detail: any) => {
                    const field = detail.loc[1];
                    newErrors[field] = detail.msg;
                });
                setErrors(newErrors);
                return;
            } else {
                throw new Error('Failed to update profile');
            }
        }

        const updatedProfile = await response.json();
        const normalized = {
            ...defaultProfile,
            ...updatedProfile,
            specialties: updatedProfile.specialties || [],
            service_areas: updatedProfile.service_areas || [],
            service_radius_miles: updatedProfile.service_radius_miles ?? defaultProfile.service_radius_miles,
        };
        setProfile(normalized);
        setEditForm(normalized);
        setIsEditing(false);
        alert('Profile updated successfully!');
    } catch (error: any) {
        console.error('Error saving profile:', error);
        alert(error.message || 'Failed to update profile. Please try again.');
    } finally {
        setSaving(false);
    }
  };


  const startEditing = () => {
    setErrors({}); // Clear all errors when entering edit mode
    setIsEditing(true);
  };

  const toggleSpecialty = (type: string) => {
    setEditForm((prev) => {
      const hasType = prev.specialties.includes(type);
      return {
        ...prev,
        specialties: hasType
          ? prev.specialties.filter((item) => item !== type)
          : [...prev.specialties, type],
      };
    });
  };

  const clearFieldError = (field: string) => {
    if (!errors[field]) return;
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleCancel = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const finalValue = type === 'number' ? Number(value) : value;
      setEditForm({ ...editForm, [name]: finalValue });
      clearFieldError(name);
    };

  const sanitizePricingValue = (value: string) => {
    if (value === "") return "";
    if (value.trim().startsWith("-")) return "0";
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly === "") return "";
    const trimmed = digitsOnly.replace(/^0+(?=\d)/, "");
    return trimmed === "" ? "0" : trimmed;
  };

  const getPricingInputValue = (value: PricingValue) => (value === "" ? "" : Number(value));

  const handlePricingChange = (
    field: "price_per_visit" | "price_per_day" | "price_per_week"
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedString = sanitizePricingValue(e.target.value);
    setEditForm((prev) => ({
      ...prev,
      [field]: sanitizedString,
    }));
    clearFieldError(field);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 rounded-full border-amber-600 border-t-transparent animate-spin"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <SitterAppHeader
        navItems={[
          { label: 'User Portal', to: '/' },
          { label: 'Dashboard', to: '/sitter/dashboard' },
          { label: 'Messages', to: '/sitter/messages' },
          { label: 'Availability', to: '/sitter/availability' },
          { label: 'Profile', to: '/sitter/profile' },
        ]}
      />

      {/* Main Content */}
      <div className="max-w-4xl px-4 py-8 mx-auto">
        <div className="p-8 bg-white border-2 shadow-xl rounded-2xl border-amber-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Sitter Profile</h1>
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-4 py-2 text-white transition-all bg-amber-600 rounded-xl hover:bg-amber-700"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 transition-all border-2 border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-white transition-all bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                      disabled
                    />
                  ) : (
                    <p className="text-gray-900">{profile.name}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                      disabled
                    />
                  ) : (
                    <p className="text-gray-900">{profile.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact & Location */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Contact & Location</h3>
              <div className="space-y-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Address</label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        name="address_line1"
                        value={editForm.address_line1}
                        onChange={handleChange}
                        placeholder="e.g., 123 Main Street, 456 Oak Ave"
                        className={`w-full px-4 py-2 mb-2 border rounded-lg ${
                          errors.address_line1 ? 'border-red-500' : ''
                        }`}
                      />
                      {errors.address_line1 && (
                        <p className="mb-2 text-sm text-red-500">{errors.address_line1}</p>
                      )}
                      <input
                        type="text"
                        name="address_line2"
                        value={editForm.address_line2}
                        onChange={handleChange}
                        placeholder="e.g., Apt 4B, Suite 200, Unit 5"
                        className={`w-full px-4 py-2 border rounded-lg ${
                          errors.address_line2 ? 'border-red-500' : ''
                        }`}
                      />
                      {errors.address_line2 && (
                        <p className="mt-1 text-sm text-red-500">{errors.address_line2}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900">
                      {[profile.address_line1, profile.address_line2].filter(Boolean).join(', ') || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Location</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <input
                            type="text"
                            name="city"
                            value={editForm.city}
                            onChange={handleChange}
                            placeholder="e.g., Baltimore, St. Louis"
                            className={`w-full px-4 py-2 border rounded-lg ${
                              errors.city ? 'border-red-500' : ''
                            }`}
                          />
                          {errors.city && (
                            <p className="mt-1 text-sm text-red-500">{errors.city}</p>
                          )}
                        </div>
                        <div>
                          <select
                            name="state"
                            value={editForm.state}
                            onChange={handleChange}
                            className={`w-full px-4 py-2 border rounded-lg ${
                              errors.state ? 'border-red-500' : ''
                            }`}
                          >
                            {usStates.map(state => (
                              <option key={state.value} value={state.value}>
                                {state.label}
                              </option>
                            ))}
                          </select>
                          {errors.state && (
                            <p className="mt-1 text-sm text-red-500">{errors.state}</p>
                          )}
                        </div>
                        <div>
                          <input
                            type="text"
                            name="zipcode"
                            value={editForm.zipcode}
                            onChange={handleChange}
                            placeholder="e.g., 12345 or 12345-6789"
                            maxLength={10}
                            className={`w-full px-4 py-2 border rounded-lg ${
                              errors.zipcode ? 'border-red-500' : ''
                            }`}
                          />
                          {errors.zipcode && (
                            <p className="mt-1 text-sm text-red-500">{errors.zipcode}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-900">
                      {[profile.city, profile.state, profile.zipcode].filter(Boolean).join(', ') || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Details */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Professional Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Campus Area</label>
                  {isEditing ? (
                    <select
                      name="campus_area"
                      value={editForm.campus_area}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="">Select area...</option>
                      {campusAreaOptions.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.campus_area || 'Not specified'}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Years of Experience</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="years_experience"
                      value={editForm.years_experience}
                      onChange={handleChange}
                      min={0}
                      className="w-32 px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.years_experience > 0
                        ? `${profile.years_experience} ${profile.years_experience === 1 ? 'year' : 'years'}`
                        : 'Not specified'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Tagline</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="tagline"
                      value={editForm.tagline}
                      onChange={handleChange}
                      placeholder="Short headline about your services"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.tagline || 'Add a catchy tagline to stand out.'}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">About You</label>
                  {isEditing ? (
                    <textarea
                      name="bio"
                      value={editForm.bio}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Share your experience, style, and what plant parents can expect."
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-line">
                      {profile.bio || 'Tell plant owners about your experience and care approach.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Specialties */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Specialties</h3>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {plantTypeOptions.map((type) => {
                    const label = type.charAt(0).toUpperCase() + type.slice(1);
                    const selected = editForm.specialties.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleSpecialty(type)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          selected
                            ? 'border-amber-500 bg-amber-50 text-amber-700 font-semibold'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-amber-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : profile.specialties && profile.specialties.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="px-3 py-1 text-sm font-medium rounded-lg bg-amber-100 text-amber-700"
                    >
                      {specialty.charAt(0).toUpperCase() + specialty.slice(1)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">Add the plant types you’re most confident caring for.</p>
              )}
            </div>

            {/* Service Coverage */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Service Coverage</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Service Radius (miles)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="service_radius_miles"
                      value={editForm.service_radius_miles}
                      onChange={handleChange}
                      min={0}
                      step={0.5}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.service_radius_miles ? `${profile.service_radius_miles} miles` : 'Not specified'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Service Areas</label>
                  {(() => {
                    // Auto-generate service areas from zipcode for display
                    const zipcode = profile.zipcode?.split('-')[0];
                    const displayAreas = profile.service_areas && profile.service_areas.length > 0 
                      ? profile.service_areas 
                      : (zipcode ? [zipcode] : []);
                    
                    return displayAreas.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {displayAreas.map((area) => (
                          <span key={area} className="px-3 py-1 text-sm font-medium rounded-lg bg-slate-100 text-slate-700">
                            {area}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">
                        Service areas will be automatically set based on your ZIP code ({zipcode || 'Not set'})
                      </p>
                    );
                  })()}
                  <p className="mt-2 text-xs text-gray-500">
                    Service areas are automatically generated from your location ZIP code for search matching.
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Pricing</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Per Visit</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="price_per_visit"
                      value={getPricingInputValue(editForm.price_per_visit)}
                      onChange={handlePricingChange("price_per_visit")}
                      className="w-full px-4 py-2 border rounded-lg"
                      min={0}
                      step={1}
                      inputMode="numeric"
                    />
                  ) : (
                    <p className="text-gray-900">${profile.price_per_visit || 0}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Per Day</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="price_per_day"
                      value={getPricingInputValue(editForm.price_per_day)}
                      onChange={handlePricingChange("price_per_day")}
                      className="w-full px-4 py-2 border rounded-lg"
                      min={0}
                      step={1}
                      inputMode="numeric"
                    />
                  ) : (
                    <p className="text-gray-900">${profile.price_per_day || 0}</p>
                  )}
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Per Week</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="price_per_week"
                      value={getPricingInputValue(editForm.price_per_week)}
                      onChange={handlePricingChange("price_per_week")}
                      className="w-full px-4 py-2 border rounded-lg"
                      min={0}
                      step={1}
                      inputMode="numeric"
                    />
                  ) : (
                    <p className="text-gray-900">${profile.price_per_week || 0}</p>
                  )}
                </div>
              </div>
            </div>

            {!profile.is_complete && (
              <div className="p-4 border rounded-xl bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-800">
                  Your profile is incomplete. Please complete all fields to get the best experience.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
