import { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { sitterService } from '../api/services';
import { SitterProfile } from '../api/types';
import Avatar from "../components/Avatar";
import { Star, MapPin, Badge, MessageCircle } from 'lucide-react';
import SitterProfileView from '../components/SitterProfileView';

const FEATURED_SITTER_ID = '64f1f77bcf86cd7994390211';

const fallbackSitter: SitterProfile = {
  id: FEATURED_SITTER_ID,
  user_id: '64f1f77bcf86cd7994390112',
  name: 'Sitter Test',
  tagline: 'Reliable plant sitter for Homewood balconies',
  bio: "Hi! I'm a horticulture student focused on tropical plants and rare aroids. I love building customized watering schedules using moisture meters and smart alerts.",
  profile_image: undefined,
  address: {
    address_1: '3200 St Paul St',
    address_2: 'Apt 204',
    city: 'Baltimore',
    state: 'MD',
    zipcode: '21218',
  },
  campus_area: 'Homewood',
  service_radius_miles: 6,
  price_per_visit: 28,
  price_per_day: 70,
  price_per_week: 380,
  service_areas: ['21218', '21211', '21210'],
  specialties: ['tropical foliage', 'humidity control', 'propagation'],
  badges: ['Verified', 'Background Checked'],
  experience_level: 'expert',
  rating: 4.8,
  total_reviews: 24,
  years_experience: 4,
  is_available: true,
  unavailable_dates: [],
  is_active: true,
  is_verified: true,
  background_checked: true,
  created_at: '2024-08-01T12:00:00.000Z',
  updated_at: '2024-10-01T12:00:00.000Z',
  availability_calendar: [],
};

export default function SitterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = new URLSearchParams(useLocation().search);
  const zip = q.get("zip") || "21218";
  const start = q.get("start") || "2025-10-08";
  const end = q.get("end") || "2025-10-11";

  const [sitter, setSitter] = useState<SitterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSitter = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);

      try {
        const response = await sitterService.getById(id);
        if (response.error) {
          if (id === FEATURED_SITTER_ID) {
            setSitter(fallbackSitter);
            setError(null);
          } else {
            setError(response.error);
          }
        } else {
          setSitter(response.data || null);
        }
      } catch (err) {
        if (id === FEATURED_SITTER_ID) {
          setSitter(fallbackSitter);
          setError(null);
        } else {
          setError('Failed to load sitter details. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSitter();
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sitter details...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.history.back()} 
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  if (!sitter) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Sitter not found</p>
          <Link 
            to="/" 
            className="mt-4 inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Search
          </Link>
        </div>
      </main>
    );
  }

  const sitterId = sitter.id || (sitter as any)._id;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <SitterProfileView
        sitter={sitter}
        variant="client"
        actionSlot={
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/chat/${sitterId}`, { state: { sitterName: sitter.name } })}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-emerald-600 text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              Chat
            </button>
            <Link
              to={`/book/${sitterId}?zip=${zip}&start=${start}&end=${end}`}
              className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
            >
              Book Now
            </Link>
          </div>
        }
      />
    </main>
  );
}
