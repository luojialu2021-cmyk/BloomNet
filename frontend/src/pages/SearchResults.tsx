import { useState, useEffect, useMemo } from 'react';
import { useLocation } from "react-router-dom";
import { sitterService } from '../api/services';
import { SitterProfile } from '../api/types';
import SitterCard from "../components/SitterCard";
import Filters, { FilterValues } from '../components/Filters';
import SortSelect, { SortOption } from "../components/SortSelect";
import SitterMap from "../components/SitterMap";
import { getCoordinatesForSitter } from "../utils/geo";

export default function SearchResults() {
  const q = new URLSearchParams(useLocation().search);
  const zip = q.get("zip") || "21218";
  const start = q.get("start") || "2025-10-08";
  const end = q.get("end") || "2025-10-11";

  const featuredSitter: SitterProfile = useMemo(() => ({
    id: "64f1f77bcf86cd7994390211",
    user_id: "64f1f77bcf86cd7994390112",
    name: "Sitter Test",
    email: "sittertest996@gmail.com",
    tagline: "Reliable plant sitter for Homewood balconies",
    bio: "Hi! I'm a horticulture student focused on tropical plants and rare aroids. I love building customized watering schedules using moisture meters and smart alerts. Test account for OOSE project.",
    profile_image: undefined,
    address: {
      address_1: "3200 St Paul St",
      address_2: "Apt 204",
      city: "Baltimore",
      state: "MD",
      zipcode: "21218",
    },
    campus_area: "Homewood",
    service_radius_miles: 6,
    price_per_visit: 28,
    price_per_day: 70,
    price_per_week: 380,
    service_areas: ["21218", "21211", "21210"],
    specialties: ["tropical foliage", "humidity control", "propagation"],
    badges: ["Verified", "Background Checked", "Test Account"],
    experience_level: "expert",
    rating: 4.8,
    total_reviews: 24,
    years_experience: 4,
    is_available: true,
    unavailable_dates: [],
    is_active: true,
    is_verified: true,
    background_checked: true,
    created_at: "2024-08-01T12:00:00.000Z",
    updated_at: "2024-10-01T12:00:00.000Z",
    availability_calendar: [],
  }), []);

  const [sitters, setSitters] = useState<SitterProfile[]>([featuredSitter]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterValues>({});
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [sortOption, setSortOption] = useState<SortOption>("featured");
  const [activeSitterId, setActiveSitterId] = useState<string | null>(null);
  const [pinnedSitterId, setPinnedSitterId] = useState<string | null>(null);

  const canShowMap = useMemo(
    () => sitters.some((s) => Boolean(getCoordinatesForSitter(s))),
    [sitters]
  );

  useEffect(() => {
    if (!canShowMap && viewMode === "map") {
      setViewMode("grid");
    }
  }, [canShowMap, viewMode]);

  useEffect(() => {
    const searchSitters = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await sitterService.search({
          // Use filter zip_code if provided, otherwise use URL param
          zip_code: filters.zip_code || zip || undefined,
          start_date: start || undefined,
          end_date: end || undefined,
          available_only: true,

          campus_area: filters.campus_area || undefined,
          min_price: filters.price_min ?? undefined,
          max_price: filters.price_max ?? undefined,
          min_rating: filters.rating_min ?? undefined,
          specialties:
            filters.specialties && filters.specialties.length > 0
              ? filters.specialties
              : undefined,
          experience_levels:
            filters.experience_levels && filters.experience_levels.length > 0
              ? filters.experience_levels
              : undefined,
          max_service_radius: filters.max_service_radius ?? undefined,
          verified_only: filters.verified_only ? true : undefined,
          background_checked_only: filters.background_checked_only ? true : undefined,
        });

        if (response.error) {
          console.warn("Falling back to featured sitter:", response.error);
          setError(null);
          setSitters([featuredSitter]);
        } else {
          const incoming = (response.data || []).filter((s: SitterProfile) => {
            const sitterId = s.id || (s as any)._id;
            return sitterId !== featuredSitter.id;
          });
          setSitters([featuredSitter, ...incoming]);
        }
      } catch (err) {
        console.error("Failed to load sitters, showing featured fallback", err);
        setError(null);
        setSitters([featuredSitter]);
      } finally {
        setLoading(false);
      }
    };

    searchSitters();
  }, [zip, start, end, filters, featuredSitter]);

  useEffect(() => {
    if (!pinnedSitterId) return;
    const stillExists = sitters.some((s) => (s.id || (s as any)._id) === pinnedSitterId);
    if (!stillExists) {
      setPinnedSitterId(null);
    }
  }, [sitters, pinnedSitterId]);

  const sortedSitters = useMemo(() => {
    const list = [...sitters];
    
    // Always put the test sitter first
    const testSitterId = "64f1f77bcf86cd7994390211";
    const testSitter = list.find(s => s.id === testSitterId);
    const otherSitters = list.filter(s => s.id !== testSitterId);
    
    let sortedOthers: SitterProfile[];
    switch (sortOption) {
      case "price_low_high":
        sortedOthers = otherSitters.sort((a, b) => a.price_per_visit - b.price_per_visit);
        break;
      case "price_high_low":
        sortedOthers = otherSitters.sort((a, b) => b.price_per_visit - a.price_per_visit);
        break;
      case "rating_high_low":
        sortedOthers = otherSitters.sort((a, b) => b.rating - a.rating);
        break;
      case "reviews_high_low":
        sortedOthers = otherSitters.sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0));
        break;
      case "featured":
      default:
        sortedOthers = otherSitters;
        break;
    }
    
    let finalList = testSitter ? [testSitter, ...sortedOthers] : sortedOthers;

    if (pinnedSitterId) {
      const idx = finalList.findIndex(s => (s.id || (s as any)._id) === pinnedSitterId);
      if (idx > 0) {
        const [pinned] = finalList.splice(idx, 1);
        finalList = [pinned, ...finalList];
      }
    }

    return finalList;
  }, [sitters, sortOption, pinnedSitterId]);

  const displayedSitters = sortedSitters;

  const toggleClassNames = (mode: "grid" | "map") => {
    const isActive = viewMode === mode;
    const base = "px-4 py-1.5 text-sm font-medium rounded-full transition";
    if (mode === "map" && !canShowMap) {
      return `${base} text-slate-400 bg-slate-100 cursor-not-allowed`;
    }
    return isActive
      ? `${base} bg-emerald-600 text-white shadow`
      : `${base} text-slate-600 hover:bg-slate-100`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200"></div>
              <div className="absolute top-0 left-0 animate-spin rounded-full h-16 w-16 border-4 border-t-emerald-600"></div>
            </div>
            <p className="text-lg font-medium text-gray-700">Finding the perfect plant sitters...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg font-semibold"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {sitters.length} Plant Sitter{sitters.length !== 1 ? 's' : ''} 
                  <span className="text-emerald-600"> near {zip}</span>
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="font-medium">{start}</span>
                  <span>→</span>
                  <span className="font-medium">{end}</span>
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={toggleClassNames("grid")}
                >
                  List view
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  className={toggleClassNames("map")}
                  disabled={!canShowMap}
                  title={canShowMap ? "Show sitters on the map" : "Map available when sitters include location data"}
                >
                  Map view
                </button>
              </div>
            </div>
          </div>

          {/* Filters & Sort */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Filters value={filters} onChange={setFilters} />
            </div>
            <div className="relative z-30">
              <SortSelect value={sortOption} onChange={setSortOption} />
            </div>
          </div>

          {/* Results */}
          {displayedSitters.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-12 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🌱</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No sitters found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search criteria or filters.</p>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg font-semibold"
              >
                Try Different Search
              </button>
            </div>
          ) : viewMode === "map" && canShowMap ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)]">
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-emerald-50">
                {displayedSitters.map((s) => (
                  <SitterCard
                    key={s.id || (s as any)._id}
                    s={{ ...s, id: s.id || (s as any)._id }}
                    zip={zip}
                    start={start}
                    end={end}
                    isActive={activeSitterId === (s.id || (s as any)._id)}
                    onHoverChange={setActiveSitterId}
                  />
                ))}
              </div>
              <div className="h-[70vh] overflow-hidden rounded-2xl border-2 border-emerald-200 shadow-lg">
                <SitterMap
                  sitters={displayedSitters}
                  activeSitterId={activeSitterId}
                  onMarkerHover={setActiveSitterId}
                  onMarkerSelect={(id) => {
                    setActiveSitterId(id);
                    setPinnedSitterId(id);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {displayedSitters.map((s) => (
                <SitterCard
                  key={s.id || (s as any)._id}
                  s={{ ...s, id: s.id || (s as any)._id }}
                  zip={zip}
                  start={start}
                  end={end}
                  isActive={activeSitterId === (s.id || (s as any)._id)}
                  onHoverChange={setActiveSitterId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
