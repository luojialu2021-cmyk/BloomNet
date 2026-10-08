import { SitterProfile, Review } from "../api/types";
import { Star, MapPin, Badge } from "lucide-react";
import Avatar from "./Avatar";
import RatingInput from "./RatingInput";
import ReviewList from "./ReviewList";

type Props = {
  sitter: SitterProfile;
  variant?: "client" | "sitter"; // toggles accents and actions
  actionSlot?: React.ReactNode;  // area for "Book Now" or "Edit Profile"
  reviews?: Review[];
  showReviews?: boolean;
};

export default function SitterProfileView({ sitter, variant = "client", actionSlot, reviews = [], showReviews = true }: Props) {
  const accent =
    variant === "sitter"
      ? "text-yellow-800"
      : "text-emerald-700";

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex gap-4 items-start">
        <Avatar name={sitter.name}/>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{sitter.name}</h1>
          {sitter.tagline && <p className="text-slate-600 text-lg">{sitter.tagline}</p>}

          <div className="mt-2 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <RatingInput
                value={sitter.rating}
                onChange={() => {}} // Read-only
                size="sm"
                interactive={false}
              />
              <span className="font-medium">{sitter.rating.toFixed(1)}</span>
              <span className="text-slate-500">({sitter.total_reviews} reviews)</span>
            </div>
            <div className={`text-lg font-semibold ${variant === "sitter" ? "text-yellow-700" : "text-emerald-600"}`}>
              ${sitter.price_per_visit} / visit
            </div>
          </div>
        </div>
      </div>

      {sitter.bio && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">About</h3>
          <p className="text-gray-700">{sitter.bio}</p>
        </div>
      )}

      {sitter.specialties.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {sitter.specialties.map((specialty, i) => (
              <span key={i} className={`px-3 py-1 ${variant === "sitter" ? "bg-yellow-100 text-yellow-800" : "bg-emerald-100 text-emerald-800"} rounded-full text-sm`}>
                {specialty}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-semibold text-lg mb-2">Location & Service Areas</h3>
        <div className="space-y-2">
          {sitter.address && (
            <div className="flex items-start gap-2 text-slate-700">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0"/>
              <div>
                <div className="font-medium">{sitter.address.address_1}</div>
                {sitter.address.address_2 && <div>{sitter.address.address_2}</div>}
                <div>{sitter.address.city}, {sitter.address.state} {sitter.address.zipcode}</div>
                {sitter.campus_area && (
                  <div className="text-sm text-emerald-600 mt-1">📍 {sitter.campus_area}</div>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <span className="font-medium">Service ZIP codes:</span>
            <span>{sitter.service_areas.join(", ")}</span>
          </div>
        </div>
      </div>

      {sitter.badges.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-2">Badges</h3>
          <div className="flex flex-wrap gap-2">
            {sitter.badges.map((badge, i) => (
              <div key={i} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <Badge className="w-3 h-3"/>
                {badge}
              </div>
            ))}
          </div>
        </div>
      )}

      {actionSlot && (
        <div className="mt-8 pt-6 border-t flex">{actionSlot}</div>
      )}

      {showReviews && (
        <div className="mt-8">
          <ReviewList 
            reviews={reviews}
            title="Reviews"
            maxHeight="max-h-64"
            showEmptyState={true}
            emptyStateMessage="No reviews yet. Be the first to leave a review!"
          />
        </div>
      )}
    </div>
  );
}
