import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Sprout,
} from "lucide-react";
import {
  reservationService,
  authService,
} from "../api/services";
import type { Reservation, User } from "../api/types";
import {
  getLocalReservationRecord,
  isLocalReservationId,
} from "../utils/localReservations";
import ReservationStatusBadge from "../components/ReservationStatusBadge";
import PaymentStatusBadge from "../components/PaymentStatusBadge";

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "—";
  const startDate = new Date(start.includes("T") ? start : `${start}T00:00:00`);
  const endDate = new Date(end.includes("T") ? end : `${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${start} → ${end}`;
  }
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "—";
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const statusCopy: Record<string, string> = {
  confirmed: "Visit confirmed",
  in_progress: "Care in progress",
  completed: "Care completed",
  cancelled: "Reservation cancelled",
};

export default function ReservationOwnerOverviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [sitter, setSitter] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadReservation = async () => {
      if (!id) {
        setError("Missing reservation id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const response = await reservationService.getById(id);
      if (cancelled) return;

      if (response.data) {
        const fetched = response.data as Reservation;
        fetched.id = fetched.id || (fetched as any)._id || id;
        setReservation(fetched);
      } else {
        const fallback = getLocalReservationRecord(id);
        if (fallback?.reservation) {
          setReservation({
            ...fallback.reservation,
            id: fallback.reservation.id || id,
          });
        } else {
          setError(response.error || "Reservation not found.");
        }
      }
      setLoading(false);
    };

    loadReservation();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      if (!reservation) return;

      if (isLocalReservationId(reservation.id)) {
        const snapshot = getLocalReservationRecord(reservation.id);
        if (snapshot?.ownerSnapshot) {
          setOwner({
            id: snapshot.ownerSnapshot.id,
            email: snapshot.ownerSnapshot.email ?? "",
            full_name: snapshot.ownerSnapshot.name,
            jhu_id: "",
            phone: "",
            bio: "",
            profile_image: undefined,
            rating: 0,
            total_reviews: 0,
            specialties: [],
            service_areas: [],
            is_available: true,
            preferred_plant_types: [],
            is_active: true,
            is_verified: false,
            created_at: reservation.created_at,
            updated_at: reservation.updated_at,
          });
        }
        if (snapshot?.sitterSnapshot) {
          setSitter({
            id: snapshot.sitterSnapshot.id,
            email: "",
            full_name: snapshot.sitterSnapshot.name,
            jhu_id: "",
            phone: "",
            bio: "",
            profile_image: undefined,
            rating: 0,
            total_reviews: 0,
            specialties: [],
            service_areas: snapshot.sitterSnapshot.service_areas ?? [],
            is_available: true,
            preferred_plant_types: [],
            is_active: true,
            is_verified: false,
            created_at: reservation.created_at,
            updated_at: reservation.updated_at,
          });
        }
        return;
      }

      const [ownerRes, sitterRes] = await Promise.all([
        authService.getUserById(reservation.owner_id),
        authService.getUserById(reservation.sitter_id),
      ]);

      if (cancelled) return;
      if (ownerRes.data) setOwner(ownerRes.data as User);
      if (sitterRes.data) setSitter(sitterRes.data as User);
    };

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [reservation]);

  const dateRange = useMemo(
    () => formatDateRange(reservation?.start_date, reservation?.end_date),
    [reservation?.start_date, reservation?.end_date]
  );
  const totalDays = useMemo(() => {
    if (!reservation?.start_date || !reservation?.end_date) return null;
    const start = new Date(reservation.start_date);
    const end = new Date(reservation.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [reservation?.start_date, reservation?.end_date]);
  const careUpdateCount = reservation?.care_updates?.length ?? 0;
  const statusDescription =
    statusCopy[reservation?.status ?? ""] ?? reservation?.status ?? "—";

  if (loading) {
    return (
      <main className="min-h-screen bg-emerald-50 flex items-center justify-center text-emerald-800">
        Loading reservation overview…
      </main>
    );
  }

  if (error || !reservation) {
    return (
      <main className="min-h-screen bg-emerald-50 flex items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm text-emerald-900 space-y-4">
          <p>{error || "Reservation not found."}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <Link
          to="/reservations"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all reservations
        </Link>

        <section className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm space-y-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                Reservation overview
              </p>
              <h1 className="text-3xl font-semibold text-emerald-900">
                {owner?.full_name || "Owner"} <span className="text-emerald-400">→</span>{" "}
                {sitter?.full_name || "Sitter"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-emerald-700">
                <span>{dateRange}</span>
                {totalDays && (
                  <>
                    <span className="hidden sm:inline text-emerald-300">•</span>
                    <span>
                      {totalDays} day{totalDays > 1 ? "s" : ""} of care
                    </span>
                  </>
                )}
                <span className="hidden sm:inline text-emerald-300">•</span>
                <span>{careUpdateCount} update{careUpdateCount === 1 ? "" : "s"}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-emerald-800">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
                  ⏳ {statusDescription}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200">
                  💳 Payment {reservation.payment_status?.replace("_", " ") || "status unknown"}
                </span>
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-right text-emerald-900">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Total amount
              </div>
              <div className="text-3xl font-semibold text-emerald-900">
                ${reservation.total_amount.toFixed(2)}
              </div>
              {totalDays && (
                <div className="text-xs text-emerald-700/80">
                  ≈ ${(reservation.total_amount / totalDays).toFixed(2)} per day
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 text-sm text-emerald-800">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <p>{reservation.location_address || "—"}</p>
              {reservation.access_instructions && (
                <p className="text-xs text-emerald-700/80">
                  Access: {reservation.access_instructions}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                <Sprout className="h-4 w-4" />
                Plants overview
              </h3>
              <p>{reservation.plants_info || "—"}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 md:col-span-3 space-y-2">
              <h3 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                <FileText className="h-4 w-4" />
                Care instructions
              </h3>
              <p className="whitespace-pre-wrap">{reservation.care_instructions || "—"}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm space-y-6">
          <header className="space-y-2">
            <h2 className="text-xl font-semibold text-emerald-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-500" />
              Status timeline
            </h2>
            <p className="text-sm text-emerald-700">
              Track each milestone from booking request through completed care.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {[
              { label: "Created", value: formatDateTime(reservation.created_at) },
              { label: "Confirmed", value: formatDateTime(reservation.confirmed_at) },
              { label: "Care started", value: formatDateTime(reservation.started_at) },
              { label: "Completed", value: formatDateTime(reservation.completed_at) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  {label}
                </div>
                <div className="mt-2 text-sm text-emerald-800">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm space-y-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <h2 className="text-xl font-semibold text-emerald-900">Care updates</h2>
                <p className="text-sm text-emerald-700">
                  Real-time updates shared by the sitter during in-progress care.
                </p>
              </div>
            </div>
            <Link
              to={`/reservations/${reservation.id}/planner`}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Plan daily tasks
            </Link>
          </header>

          {reservation.care_updates?.length ? (
            <div className="space-y-4">
              {reservation.care_updates.map((update) => (
                <article
                  key={update.id}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-2"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatDateTime(update.date)}
                  </div>
                  <p className="text-sm text-emerald-900">{update.notes}</p>
                  {update.care_actions?.length ? (
                    <div className="flex flex-wrap gap-2 text-xs text-emerald-700">
                      {update.care_actions.map((action) => (
                        <span
                          key={action}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border border-emerald-200"
                        >
                          ✅ {action}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-sm text-emerald-700 space-y-3">
              <div>
                <p className="font-semibold text-emerald-800">Open daily tasks</p>
                <p>No updates shared yet. When the sitter posts their first update, it will appear here.</p>
              </div>
              <Link
                to={`/reservations/${reservation.id}/planner`}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                Create task templates
              </Link>
            </div>
          )}
        </section>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <ReservationStatusBadge status={reservation.status} />
            <PaymentStatusBadge status={reservation.payment_status} />
          </div>
          <Link
            to="/reservations"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            Back to all reservations
          </Link>
        </div>
      </div>
    </main>
  );
}
