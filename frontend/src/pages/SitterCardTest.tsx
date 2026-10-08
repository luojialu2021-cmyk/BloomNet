import React from 'react';
import { useNavigate } from 'react-router-dom';
import SitterCard from '../components/SitterCard';
import type { SitterProfile } from '../api/types';

const SitterCardTest: React.FC = () => {
  const navigate = useNavigate();

  const sampleSitters: SitterProfile[] = [
    {
      id: '507f1f77bcf86cd799439011',
      user_id: 'user1',
      name: 'Alex Green',
      rating: 4.8,
      total_reviews: 15,
      specialties: ['Indoor Plants', 'Succulents'],
      service_radius_miles: 3,
      profile_image: undefined,
      bio: 'Experienced plant sitter with green thumb',
      is_active: true,
      is_verified: true,
      background_checked: true,
      price_per_visit: 25,
      price_per_day: 40,
      service_areas: ['Homewood'],
      badges: ['Expert'],
      is_available: true,
      unavailable_dates: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center text-gray-900">Sitter Card Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">What to Test</h3>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Sitter cards display properly with star ratings</li>
          <li>• Click on cards to navigate to sitter details</li>
          <li>• Ratings show as filled stars based on average rating</li>
        </ul>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleSitters.map((sitter) => (
          <SitterCard key={sitter.id} s={sitter} zip="21218" start="2024-01-15" end="2024-01-20" />
        ))}
      </div>
    </div>
  );
};

export default SitterCardTest;

