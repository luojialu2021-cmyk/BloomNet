import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  reservationService,
  authService,
} from "../api/services";
import type {
  Reservation,
  User,
} from "../api/types";
import ReservationStatusBadge from "../components/ReservationStatusBadge";
import {
  getLocalReservationRecord,
  isLocalReservationId,
  LocalReservationSnapshot,
} from "../utils/localReservations";
import { useOwnerAuth } from "../contexts/AuthContext";

const formatDateRange = (start: string, end: string) => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${formatter.format(new Date(start))} → ${formatter.format(
    new Date(end)
  )}`;
};

export default function ReservationConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useOwnerAuth();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [sitter, setSitter] = useState<User | null>(null);
  const [localSnapshot, setLocalSnapshot] =
    useState<LocalReservationSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!id) {
        setError("Missing reservation id");
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await reservationService.getById(id);
      if (!mounted) return;

      if (res.data) {
        const normalized = res.data as Reservation;
        normalized.id = normalized.id || (normalized as any)._id || id;
        setReservation(normalized);
        if (isLocalReservationId(normalized.id)) {
          const snapshot = getLocalReservationRecord(normalized.id);
          setLocalSnapshot(snapshot ?? null);
        } else {
          setLocalSnapshot(null);
        }
        setError(null);
      } else {
        const snapshot = getLocalReservationRecord(id);
        if (snapshot) {
          setLocalSnapshot(snapshot);
          setReservation(snapshot.reservation);
          setError(null);
        } else {
          setError(res.error || "Reservation not found.");
        }
      }
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      if (!reservation) return;

      if (isLocalReservationId(reservation.id)) {
        const snapshot =
          localSnapshot || getLocalReservationRecord(reservation.id || "");
        if (!cancelled && snapshot) {
          const now = new Date().toISOString();
          if (snapshot.ownerSnapshot) {
            setOwner({
              id: snapshot.ownerSnapshot.id,
              email: snapshot.ownerSnapshot.email || "",
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
              created_at: now,
              updated_at: now,
            });
          }
          if (snapshot.sitterSnapshot) {
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
              service_areas: snapshot.sitterSnapshot.service_areas || [],
              is_available: true,
              preferred_plant_types: [],
              is_active: true,
              is_verified: false,
              created_at: now,
              updated_at: now,
            });
          }
        }
        return;
      }

      const [ownerRes, sitterRes] = await Promise.all([
        authService.getUserById(reservation.owner_id),
        authService.getUserById(reservation.sitter_id),
      ]);
      if (!cancelled) {
        if (ownerRes.data) setOwner(ownerRes.data as User);
        if (sitterRes.data) setSitter(sitterRes.data as User);
      }
    };
    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [reservation, localSnapshot]);

  const subtotal = useMemo(() => {
    if (!reservation) return "0.00";
    return reservation.total_amount.toFixed(2);
  }, [reservation]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center text-slate-500">
          Preparing your reservation…
        </div>
      </main>
    );
  }

  if (error || !reservation) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center text-red-600">{error || "Not found"}</div>
      </main>
    );
  }

  const reservationId = reservation.id || (reservation as any)._id || id;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <section className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
        <div>
          <p className="text-sm text-emerald-600 font-semibold uppercase tracking-wide">
            Reservation created
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            🌱 You’re all set!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Share the details below with your plant sitter. Manage updates from
            your reservation dashboard anytime.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReservationStatusBadge status={reservation.status} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Reservation summary
            </h2>
            <dl className="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-800">Date range</dt>
                <dd>{formatDateRange(reservation.start_date, reservation.end_date)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">Total amount</dt>
                <dd>${subtotal}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">Plant parent</dt>
                <dd>{owner?.full_name || `Owner ${reservation.owner_id.slice(-5)}`}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">Plant sitter</dt>
                <dd>{sitter?.full_name || `Sitter ${reservation.sitter_id.slice(-5)}`}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">Location</dt>
                <dd>{reservation.location_address}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">Plant notes</dt>
                <dd>{reservation.plants_info}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="font-semibold text-slate-800">
                  Care instructions
                </dt>
                <dd className="whitespace-pre-wrap">
                  {reservation.care_instructions}
                </dd>
              </div>
              {reservation.special_notes && (
                <div className="md:col-span-2">
                  <dt className="font-semibold text-slate-800">
                    Special notes
                  </dt>
                  <dd className="whitespace-pre-wrap">
                    {reservation.special_notes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              Quick links
            </h3>
            <div className="grid gap-2">
              <button
                onClick={() => navigate(`/reservations/${reservationId}/detail`)}
                className="w-full px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-xl hover:bg-emerald-200"
              >
                View reservation details
              </button>
              <button
                onClick={() => {
                  if (isAuthenticated) {
                    navigate("/reservations");
                  } else {
                    // Redirect to login, then to reservations
                    navigate("/login", { state: { from: { pathname: "/reservations" } } });
                  }
                }}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
              >
                {isAuthenticated ? "Go to my reservations" : "Login to view reservations"}
              </button>
            </div>
          </div>
        </aside>
      </section>

      <div className="text-xs text-slate-400 text-center">
        Reservation ID: {reservationId}
      </div>
    </main>
  );
}
