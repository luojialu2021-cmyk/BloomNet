import { Link } from "react-router-dom";
import { MapPin, Star, ShieldCheck } from "lucide-react";
import Avatar from "./Avatar";
import { SitterProfile } from "../api/types";
import RatingInput from "./RatingInput";

type SitterCardProps = {
  s: SitterProfile;
  zip: string;
  start: string;
  end: string;
  isActive?: boolean;
  onHoverChange?: (id: string | null) => void;
};

export default function SitterCard({ s, zip, start, end, isActive = false, onHoverChange }: SitterCardProps) {
  // Handle both id and _id fields from backend
  const sitterId = s.id || (s as any)._id;
  const addressLabel = s.address
    ? [s.address.city, s.address.state ? `${s.address.state} ${s.address.zipcode}` : s.address.zipcode]
        .filter(Boolean)
        .join(", ")
    : s.service_areas.join(", ");
  const topSpecialties = (s.specialties || []).slice(0, 3);

  const handleHoverStart = () => onHoverChange?.(sitterId);
  const handleHoverEnd = () => onHoverChange?.(null);

  const cardClasses = [
    "flex flex-col gap-4 p-5 transition bg-white border group rounded-3xl hover:shadow-xl focus:outline-none",
    "hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:shadow-xl",
    isActive
      ? "border-violet-300 shadow-xl ring-2 ring-violet-200"
      : "border-slate-200 hover:border-violet-200 focus-visible:border-violet-200"
  ].join(" ");

  return (
    <Link to={`/sitter/${sitterId}?zip=${zip}&start=${start}&end=${end}`}
          className={cardClasses}
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
          onFocus={handleHoverStart}
          onBlur={handleHoverEnd}
    >
      <div className="flex items-start gap-4">
        <Avatar name={s.name}/>
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{s.name}</h3>
              {s.tagline && <p className="text-sm text-slate-600">{s.tagline}</p>}
            </div>
            <div className="text-right">
              <div className="text-base font-semibold text-emerald-600">${s.price_per_visit.toFixed(2)}</div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">per visit</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-600">
            <div className="flex items-center">
              <RatingInput
                value={s.rating}
                onChange={() => {}} // Read-only
                size="sm"
                interactive={false}
              />
            </div>
            <span className="font-semibold text-slate-800">{s.rating.toFixed(1)}</span>
            <span className="text-slate-500">({s.total_reviews} reviews)</span>
            {s.experience_level && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
                <ShieldCheck className="w-3 h-3"/> {s.experience_level}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <MapPin className="w-4 h-4 text-emerald-500"/>
        <span>{addressLabel || "Baltimore area"}</span>
        {s.service_radius_miles && (
          <span className="px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full">
            {s.service_radius_miles} mile radius
          </span>
        )}
      </div>

      {topSpecialties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topSpecialties.map((spec) => (
            <span
              key={spec}
              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full capitalize"
            >
              {spec}
            </span>
          ))}
        </div>
      )}

      {s.bio && (
        <p className="text-sm leading-relaxed text-slate-600 line-clamp-2">
          {s.bio}
        </p>
      )}
    </Link>
  );
}
