import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SitterAppHeader from "../components/SitterAppHeader";
import { useSitterAuth } from "../contexts/AuthContext";
import ReservationStatusBadge from "../components/ReservationStatusBadge";
import { reservationService, authService, sitterService } from "../api/services";
import type { Reservation, User } from "../api/types";
import {
  listLocalReservationRecords,
  getLocalReservationRecord,
  isLocalReservationId,
} from "../utils/localReservations";
import { formatDateRangeET, formatDateET, formatDateTimeET, formatRelativeTime } from "../utils/dateUtils";

const ACTIVE_STATUSES: Reservation["status"][] = [
  "confirmed",
  "in_progress",
];

const COMPLETED_STATUSES: Reservation["status"][] = ["completed"];

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value);

// Use Eastern Time formatting
const formatDateRange = formatDateRangeET;
const formatDateLong = formatDateET;
const formatDateTime = formatDateTimeET;

const extractId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const record = value as Record<string, any>;
    if (typeof record.$oid === "string") return record.$oid;
    if (typeof record.id === "string") return record.id;
    if (typeof record._id === "string") return record._id;
    if (typeof record.toHexString === "function") {
      return record.toHexString();
    }
    if (typeof record.toString === "function") {
      const repr = record.toString();
      const match = /^ObjectId\("([^"]+)"\)$/.exec(repr);
      if (match) return match[1];
    }
  }
  return "";
};

const normalizeReservation = (
  reservation: Reservation | Record<string, any>
): Reservation => {
  const base = reservation as Record<string, any>;
  return {
    ...(reservation as Reservation),
    id: extractId(base.id ?? base._id),
    owner_id: extractId(base.owner_id),
    sitter_id: extractId(base.sitter_id),
    sitter_profile_id: base.sitter_profile_id
      ? extractId(base.sitter_profile_id)
      : (reservation as Reservation).sitter_profile_id,
  };
};

const completionTimestamp = (reservation: Reservation): string | null => {
  return (
    reservation.completed_at ||
    reservation.end_date ||
    reservation.updated_at ||
    reservation.start_date ||
    null
  );
};

const parseDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  return new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
};

const toTimestamp = (iso?: string | null): number => {
  const parsed = parseDate(iso);
  return parsed ? parsed.getTime() : 0;
};

const BOOKING_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

type BookingFilter = (typeof BOOKING_FILTERS)[number]["value"];

export default function SitterDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useSitterAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [bookingFilter] = useState<BookingFilter>("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [sitterProfileId, setSitterProfileId] = useState<string | null>(null);
  const [sitterUserId, setSitterUserId] = useState<string | null>(null); // Fixed sitter user ID
  const [sitterEmail, setSitterEmail] = useState<string | null>(null); // Fixed sitter email
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(
    null
  );

  const displayName = useMemo(() => {
    return (
      (user as any)?.name ||
      (user as any)?.full_name ||
      user?.email ||
      localStorage.getItem("auth_username") ||
      "Sitter"
    );
  }, [user]);

  // Get current logged-in user ID (may change when user portal switches)
  const currentUserId = useMemo(() => {
    const userId = (
      extractId((user as any)?.id) ||
      extractId((user as any)?.user_id) ||
      localStorage.getItem("sitter_auth_user_id") || // Try sitter auth first
      localStorage.getItem("auth_user_id") || // Fallback to old key
      ""
    );
    console.log('Current user object:', user);
    console.log('Extracted currentUserId:', userId);
    console.log('localStorage sitter_auth_user_id:', localStorage.getItem("sitter_auth_user_id"));
    console.log('localStorage auth_user_id:', localStorage.getItem("auth_user_id"));
    return userId;
  }, [user]);

  const currentUserEmail = useMemo(() => {
    const email = (
      (user as any)?.email ||
      localStorage.getItem("sitter_auth_email") ||
      localStorage.getItem("auth_email") ||
      ""
    );
    console.log('Current user email:', email);
    return email;
  }, [user]);

  const applyLocalOwnerSnapshots = useCallback(
    (list: Reservation[]) => {
      const updates: Record<string, string> = {};
      list.forEach((reservation) => {
        const snapshot = getLocalReservationRecord(
          reservation.id || (reservation as any)._id || ""
        );
        if (!snapshot) return;
        if (snapshot.ownerSnapshot) {
          updates[extractId(snapshot.ownerSnapshot.id)] =
            snapshot.ownerSnapshot.name;
        }
      });
      if (Object.keys(updates).length) {
        setOwnerNames((prev) => ({ ...updates, ...prev }));
      }
    },
    []
  );

  const fetchReservations = useCallback(async () => {
    // Use fixed sitter ID/email instead of current user ID/email
    // This ensures we show all reservations for this sitter, regardless of which user is logged in
    const fixedSitterId = sitterUserId || currentUserId;
    const fixedSitterEmail = sitterEmail || currentUserEmail;
    
    if (!fixedSitterId && !fixedSitterEmail) {
      setReservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await reservationService.getMyReservations();
      let data: Reservation[] = [];

      if (response.data) {
        data = (response.data as Reservation[]).map(normalizeReservation);
      } else {
        const records = listLocalReservationRecords();
        if (records.length) {
          data = records.map((record) =>
            normalizeReservation(record.reservation)
          );
        }
      }

      console.log('All reservations from API/local:', data);
      console.log('Fixed sitter user ID (for filtering):', fixedSitterId);
      console.log('Fixed sitter email (for filtering):', fixedSitterEmail);
      console.log('Sitter profile ID:', sitterProfileId);
      console.log('Current user ID (may change):', currentUserId);

      const sitterReservations = data
        .filter((reservation) => {
          const resolvedId = extractId(reservation.id);
          if (isLocalReservationId(resolvedId)) {
            return false;
          }
          const sitterId = extractId(reservation.sitter_id);
          const profileField = extractId((reservation as any).sitter_profile_id);
          
          // Try to get sitter email from multiple sources
          const reservationSitterEmail = (reservation as any).sitter_email || 
                            (reservation as any).sitter?.email ||
                            (reservation as any).sitterSnapshot?.email;
          
          console.log('Checking reservation:', {
            reservationId: reservation.id,
            sitterId,
            profileField,
            reservationSitterEmail,
            fixedSitterEmail,
            fixedSitterId,
            matchUserId: sitterId === fixedSitterId,
            matchEmail: reservationSitterEmail && fixedSitterEmail && reservationSitterEmail === fixedSitterEmail,
            matchProfileId: sitterProfileId && (sitterId === sitterProfileId || profileField === sitterProfileId)
          });
          
          // Match by fixed sitter ID first (most reliable, won't change when user portal switches)
          // This is the primary matching method since sitter_id is always set
          if (fixedSitterId && sitterId === fixedSitterId) {
            console.log(`  ✓ Matched by sitter_id: ${sitterId} === ${fixedSitterId}`);
            return true;
          }
          
          // Match by fixed sitter email (won't change when user portal switches)
          if (reservationSitterEmail && fixedSitterEmail && reservationSitterEmail.toLowerCase() === fixedSitterEmail.toLowerCase()) {
            console.log(`  ✓ Matched by email: ${reservationSitterEmail} === ${fixedSitterEmail}`);
            return true;
          }
          
          // Fallback to profile ID matching (if sitter_profile_id matches)
          if (sitterProfileId) {
            if (sitterId === sitterProfileId || profileField === sitterProfileId) {
              console.log(`  ✓ Matched by profile_id: ${sitterProfileId}`);
              return true;
            }
          }
          
          console.log(`  ✗ No match for reservation ${reservation.id}`);
          return false;
        })
        .sort(
          (a, b) =>
            new Date(`${a.start_date}T00:00:00`).getTime() -
            new Date(`${b.start_date}T00:00:00`).getTime()
        );

      console.log('Filtered sitter reservations:', sitterReservations);

      if (!sitterReservations.length) {
        try {
          const seedResponse = await reservationService.seedDevSample({
            forCurrentUser: true,
          });
          if (seedResponse.data) {
            const seeded = (seedResponse.data as Reservation[])
              .map(normalizeReservation)
              .filter(
                (reservation) =>
                  extractId(reservation.sitter_id) === currentUserId
              )
              .sort(
                (a, b) =>
                  new Date(`${a.start_date}T00:00:00`).getTime() -
                  new Date(`${b.start_date}T00:00:00`).getTime()
              );
            if (seeded.length) {
              setReservations(seeded);
              applyLocalOwnerSnapshots(seeded);
              return;
            }
          }
        } catch (seedError) {
          console.warn("Unable to seed sitter demo reservation", seedError);
        }

      }

      setReservations(sitterReservations);
      applyLocalOwnerSnapshots(sitterReservations);
    } catch (err: any) {
      setError(err?.message || "Unable to load sitter bookings.");
    } finally {
      setLoading(false);
    }
  }, [sitterUserId, sitterEmail, sitterProfileId, currentUserId, currentUserEmail, applyLocalOwnerSnapshots]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/sitter/login");
      return;
    }
    fetchReservations();
  }, [authLoading, isAuthenticated, navigate, fetchReservations]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    (async () => {
      try {
        // Get the sitter profile for the currently logged-in sitter
        // This profile is tied to the sitter portal login, not the user portal login
        console.log('Fetching sitter profile for current sitter user...');
        const response = await sitterService.getMyProfile();
        console.log('Sitter profile response:', response);
        
        if (response.data) {
          const profile = response.data as any;
          console.log('Sitter profile data:', profile);
          
          const profileId =
            extractId(profile.id) ||
            extractId(profile._id) ||
            null;
          console.log('Extracted profile ID:', profileId);
          setSitterProfileId(profileId);
          
          // Set fixed sitter user ID and email from profile
          // These values are tied to the sitter portal login, not the user portal login
          // So they won't change when user portal switches accounts
          const profileUserId = extractId(profile.user_id) || null;
          const profileEmail = profile.email || null;
          
          console.log('Setting fixed sitter user ID (from sitter portal login):', profileUserId);
          console.log('Setting fixed sitter email (from sitter portal login):', profileEmail);
          
          setSitterUserId(profileUserId);
          setSitterEmail(profileEmail);
        } else {
          console.log('No profile data in response');
          setSitterProfileId(null);
          // Fallback to current user if no profile
          setSitterUserId(currentUserId || null);
          setSitterEmail(currentUserEmail || null);
        }
      } catch (profileError) {
        console.warn("Unable to load sitter profile", profileError);
        setSitterProfileId(null);
        // Fallback to current user if profile fetch fails
        setSitterUserId(currentUserId || null);
        setSitterEmail(currentUserEmail || null);
      }
    })();
  }, [authLoading, isAuthenticated]); // Remove currentUserId and currentUserEmail from dependencies

  useEffect(() => {
    const records = listLocalReservationRecords();
    if (!records.length) return;
    const updates: Record<string, string> = {};
    records.forEach((record) => {
      if (record.ownerSnapshot) {
        updates[extractId(record.ownerSnapshot.id)] =
          record.ownerSnapshot.name;
      }
    });
    if (Object.keys(updates).length) {
      setOwnerNames((prev) => ({ ...updates, ...prev }));
    }
  }, []);

  useEffect(() => {
    const missingOwnerIds = reservations
      .map((reservation) => extractId(reservation.owner_id))
      .filter(Boolean)
      .filter((ownerId) => !ownerNames[ownerId]);

    if (!missingOwnerIds.length) return;

    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const ownerId of missingOwnerIds) {
        const response = await authService.getUserById(ownerId);
        if (response.data) {
          const owner = response.data as User;
          entries[ownerId] =
            owner.full_name ||
            (owner as any).name ||
            owner.email ||
            `Plant owner ${ownerId.slice(-5)}`;
        } else {
          entries[ownerId] = `Plant owner ${ownerId.slice(-5)}`;
        }
      }
      if (!cancelled && Object.keys(entries).length) {
        setOwnerNames((prev) => ({ ...entries, ...prev }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reservations, ownerNames]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = window.setTimeout(() => setActionMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  const stats = useMemo(() => {
    const totalBookings = reservations.length;
    const completedBookings = reservations.filter((reservation) =>
      COMPLETED_STATUSES.includes(reservation.status)
    ).length;
    const pendingRequests = 0; // No pending status for sitters
    const activeBookings = reservations.filter((reservation) =>
      ACTIVE_STATUSES.includes(reservation.status)
    ).length;
    // Calculate earnings from all reservations (all are paid, no need to filter by status)
    const earnings = reservations
      .reduce((sum, reservation) => sum + (reservation.total_amount ?? 0), 0);
    const ratingValues = reservations
      .map((reservation) => reservation.owner_rating)
      .filter((value): value is number => typeof value === "number");
    const averageRating = ratingValues.length
      ? ratingValues.reduce((sum, rating) => sum + rating, 0) /
        ratingValues.length
      : null;
    const reviewCount = reservations.filter(
      (reservation) => !!reservation.owner_review
    ).length;
    const upcoming = reservations
      .filter((reservation) => ACTIVE_STATUSES.includes(reservation.status))
      .sort(
        (a, b) =>
          new Date(`${a.start_date}T00:00:00`).getTime() -
          new Date(`${b.start_date}T00:00:00`).getTime()
      );
    return {
      totalBookings,
      completedBookings,
      pendingRequests,
      activeBookings,
      earnings,
      averageRating,
      reviewCount,
      nextReservation: upcoming[0] ?? null,
    };
  }, [reservations]);

  const upcomingReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => ACTIVE_STATUSES.includes(reservation.status))
        .sort(
          (a, b) =>
            new Date(`${a.start_date}T00:00:00`).getTime() -
            new Date(`${b.start_date}T00:00:00`).getTime()
        ),
    [reservations]
  );

  const completedReservations = useMemo(
    () =>
      reservations.filter((reservation) =>
        COMPLETED_STATUSES.includes(reservation.status)
      ),
    [reservations]
  );

  const computeMonthlyEarnings = useCallback(
    (offset: number) => {
      const now = new Date();
      const reference = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const targetMonth = reference.getMonth();
      const targetYear = reference.getFullYear();
      // Calculate from all reservations using start_date to determine month
      return reservations.reduce((sum, reservation) => {
        // Use start_date to determine which month the reservation belongs to
        if (!reservation.start_date) return sum;
        const reservationDate = parseDate(reservation.start_date);
        if (
          reservationDate &&
          reservationDate.getMonth() === targetMonth &&
          reservationDate.getFullYear() === targetYear
        ) {
          return sum + (reservation.total_amount ?? 0);
        }
        return sum;
      }, 0);
    },
    [reservations]
  );

  const recentActivity = useMemo(() => {
    return reservations
      .map((reservation) => {
        const timestamp =
          reservation.updated_at ||
          reservation.completed_at ||
          reservation.confirmed_at ||
          reservation.created_at ||
          reservation.start_date;
        return { reservation, timestamp };
      })
      .filter((entry) => !!entry.timestamp)
      .sort(
        (a, b) =>
          toTimestamp(b.timestamp) - toTimestamp(a.timestamp)
      )
      .slice(0, 3);
  }, [reservations]);

  const reviews = useMemo(() => {
    return reservations
      .filter(
        (reservation) =>
          // Only show completed reservations with owner rating
          reservation.completed_at &&
          (reservation.owner_review ||
            typeof reservation.owner_rating === "number")
      )
      .sort(
        (a, b) =>
          // Sort by completed_at (most recent first)
          toTimestamp(b.completed_at) - toTimestamp(a.completed_at)
      );
  }, [reservations]);

  const recentTransactions = useMemo(() => {
    // Show all reservations (all are paid), sorted by start_date (most recent first)
    return reservations
      .filter((reservation) => reservation.start_date) // Only show reservations with start_date
      .map((reservation) => ({
        reservation,
      }))
      .sort(
        (a, b) =>
          toTimestamp(b.reservation.start_date) -
          toTimestamp(a.reservation.start_date)
      )
      .slice(0, 5);
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    switch (bookingFilter) {
      case "active":
        return reservations.filter((reservation) =>
          ACTIVE_STATUSES.includes(reservation.status)
        );
      case "completed":
        return reservations.filter((reservation) =>
          COMPLETED_STATUSES.includes(reservation.status)
        );
      default:
        return reservations;
    }
  }, [reservations, bookingFilter]);

  const updateReservationInState = useCallback(
    (nextReservation: Reservation) => {
      const normalized = normalizeReservation(nextReservation);
      setReservations((prev) => {
        const exists = prev.some(
          (reservation) => reservation.id === normalized.id
        );
        if (!exists) {
          return [normalized, ...prev];
        }
        return prev.map((reservation) =>
          reservation.id === normalized.id ? normalized : reservation
        );
      });
      applyLocalOwnerSnapshots([normalized]);
    },
    [applyLocalOwnerSnapshots]
  );

  const handleAcceptBooking = async (reservationId: string) => {
    setBusyReservationId(reservationId);
    setActionMessage(null);
    try {
      const response = await reservationService.confirm(reservationId);
      if (response.data) {
        updateReservationInState(response.data as Reservation);
        setActionMessage("Booking accepted.");
      } else if (response.error) {
        setError(
          typeof response.error === "string"
            ? response.error
            : "Unable to accept booking."
        );
      }
    } catch (err: any) {
      setError(err?.message || "Unable to accept booking.");
    } finally {
      setBusyReservationId(null);
    }
  };

  const handleDeclineBooking = async (reservationId: string) => {
    setBusyReservationId(reservationId);
    setActionMessage(null);
    try {
      const response = await reservationService.cancel(
        reservationId,
        "Sitter declined the request."
      );
      if (response.data) {
        updateReservationInState(response.data as Reservation);
        setActionMessage("Booking declined.");
      } else if (response.error) {
        setError(
          typeof response.error === "string"
            ? response.error
            : "Unable to decline booking."
        );
      }
    } catch (err: any) {
      setError(err?.message || "Unable to decline booking.");
    } finally {
      setBusyReservationId(null);
    }
  };

  const handleStartCare = async (reservationId: string) => {
    setBusyReservationId(reservationId);
    setActionMessage(null);
    try {
      const response = await reservationService.start(reservationId);
      if (response.data) {
        updateReservationInState(response.data as Reservation);
        setActionMessage("Care period started.");
        navigate(`/reservations/${reservationId}/tasks`);
      } else if (response.error) {
        setError(
          typeof response.error === "string"
            ? response.error
            : "Unable to start care."
        );
      }
    } catch (err: any) {
      setError(err?.message || "Unable to start care.");
    } finally {
      setBusyReservationId(null);
    }
  };

  const handleCompleteCare = async (reservationId: string) => {
    setBusyReservationId(reservationId);
    setActionMessage(null);
    try {
      const response = await reservationService.complete(reservationId);
      if (response.data) {
        updateReservationInState(response.data as Reservation);
        setActionMessage("Visit marked as completed.");
      } else if (response.error) {
        setError(
          typeof response.error === "string"
            ? response.error
            : "Unable to complete booking."
        );
      }
    } catch (err: any) {
      setError(err?.message || "Unable to complete booking.");
    } finally {
      setBusyReservationId(null);
    }
  };

  const renderActions = (reservation: Reservation) => {
    if (reservation.status === "completed" || reservation.status === "cancelled") {
      return null;
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => navigate(`/reservations/${reservation.id}/detail?as=sitter`)}
          className="px-3 py-1.5 text-sm font-semibold text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200"
        >
          Open tasks
        </button>
      </div>
    );
  };

  const averageRatingDisplay =
    stats.averageRating !== null ? stats.averageRating.toFixed(1) : "—";

  const thisMonthEarnings = computeMonthlyEarnings(0);
  const lastMonthEarnings = computeMonthlyEarnings(-1);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 border-4 rounded-full border-amber-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-600">
            {authLoading ? "Verifying your session…" : "Loading sitter dashboard…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-slate-50">
      <SitterAppHeader
        navItems={[
          { label: "User Portal", to: "/" },
          { label: "Dashboard", to: "/sitter/dashboard" },
          { label: "Messages", to: "/sitter/messages" },
          { label: "Availability", to: "/sitter/availability" },
        ]}
      />

      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">
            Welcome back, {displayName}!
          </h1>
          <p className="text-sm text-slate-600">
            Track active visits, review plant care updates, and stay on top of new requests.
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 mb-6 text-sm border rounded-xl border-rose-200 bg-rose-50 text-rose-600">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="px-4 py-3 mb-6 text-sm border rounded-xl border-amber-200 bg-amber-50 text-amber-700">
            {actionMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-6 bg-white shadow-sm rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 text-xl bg-amber-100 rounded-xl">
                📅
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase text-amber-600">
                  Active bookings
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.activeBookings}
                </p>
                <p className="text-xs text-amber-600/70">
                  {stats.totalBookings} total • {stats.completedBookings} completed
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-sm rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 text-xl bg-amber-100 rounded-xl">
                💰
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase text-amber-600">
                  Total earnings
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(stats.earnings)}
                </p>
                <p className="text-xs text-amber-600/70">
                  From {stats.totalBookings} reservation
                  {stats.totalBookings === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shadow-sm rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 text-xl bg-amber-100 rounded-xl">
                ⭐
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase text-amber-600">
                  Average rating
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {averageRatingDisplay}
                </p>
                <p className="text-xs text-slate-500">
                  {stats.reviewCount} review{stats.reviewCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-2xl">
          <div className="border-b border-slate-200">
            <nav className="flex px-6 -mb-px space-x-8">
              {[
                { id: "overview", name: "Overview", icon: "📊" },
                { id: "bookings", name: "Bookings", icon: "📅" },
                { id: "earnings", name: "Earnings", icon: "💰" },
                { id: "reviews", name: "Reviews", icon: "⭐" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 space-y-8">
            {activeTab === "overview" && (
              <div className="space-y-8">
                <section>
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">
                    Upcoming bookings
                  </h3>
                  {upcomingReservations.length === 0 ? (
                    <div className="px-4 py-6 text-sm border border-dashed rounded-2xl border-amber-200 bg-amber-50/60 text-amber-700/80">
                      You don’t have any upcoming assignments right now. New requests will appear here as soon as plant owners reach out.
                      </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {upcomingReservations.slice(0, 4).map((reservation) => (
                        <article
                          key={reservation.id}
                          className="px-5 py-4 border shadow-sm rounded-2xl border-amber-100 bg-amber-50/70"
                        >
                          <div className="flex items-start justify-between gap-3">
                      <div>
                              <p className="text-sm font-semibold text-amber-700">
                                {ownerNames[extractId(reservation.owner_id)] ||
                                  "Plant owner"}
                              </p>
                              <p className="text-xs text-amber-600/80">
                                {formatDateRange(
                                  reservation.start_date,
                                  reservation.end_date
                                )}
                              </p>
                      </div>
                            <ReservationStatusBadge
                              status={reservation.status}
                            />
                    </div>
                          <p className="mt-3 text-sm text-amber-700/90">
                            {reservation.plants_info ||
                              "Custom care instructions waiting in the booking detail."}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            <button
                              onClick={() =>
                                navigate(`/reservations/${reservation.id}/detail?as=sitter`)
                              }
                              className="inline-flex items-center rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-100"
                            >
                              Open tasks
                            </button>
                      </div>
                        </article>
                      ))}
                      </div>
                  )}
                </section>

                <section>
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">
                    Recent activity
                  </h3>
                  {recentActivity.length === 0 ? (
                    <div className="px-4 py-6 text-sm bg-white border border-dashed rounded-2xl border-slate-200 text-slate-500">
                      Activity from your reservations will appear here — confirm a booking or complete a visit to see updates.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map(({ reservation, timestamp }, index) => {
                        const owner =
                          ownerNames[extractId(reservation.owner_id)] ||
                          "plant owner";
                        let title = `Update from ${owner}`;
                        if (reservation.status === "confirmed") {
                          title = `Visit confirmed for ${owner}`;
                        } else if (reservation.status === "in_progress") {
                          title = `Care in progress for ${owner}`;
                        } else if (reservation.status === "completed") {
                          title = `Visit completed for ${owner}`;
                        } else if (reservation.status === "cancelled") {
                          title = `Booking cancelled by ${owner}`;
                        }
                        return (
                          <div
                            key={`${reservation.id}-${index}`}
                            className="flex items-start gap-3 px-4 py-3 border rounded-2xl border-slate-200 bg-slate-50"
                          >
                            <div className="flex items-center justify-center rounded-full h-9 w-9 bg-amber-100 text-amber-600">
                              🌿
                      </div>
                      <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {title}
                              </p>
                              <p className="text-xs text-slate-500">
                                {timestamp ? formatRelativeTime(timestamp) : "Recently"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDateRange(
                                  reservation.start_date,
                                  reservation.end_date
                                )}
                              </p>
                      </div>
                    </div>
                        );
                      })}
                  </div>
                  )}
                </section>

                <section>
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">
                    Quick actions
                  </h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <button
                      onClick={() => navigate("/sitter/messages")}
                      className="flex flex-col items-start gap-2 px-4 py-4 text-left border shadow-sm rounded-2xl border-sky-200 bg-sky-50 hover:border-sky-300 hover:bg-sky-100"
                    >
                      <span className="text-xl">💬</span>
                      <p className="text-sm font-semibold text-sky-700">
                        Open messages
                      </p>
                      <p className="text-xs text-sky-600">
                        Respond quickly to build trust with plant owners.
                      </p>
                    </button>
                    <button
                      onClick={() => navigate("/sitter/availability")}
                      className="flex flex-col items-start gap-2 px-4 py-4 text-left border shadow-sm rounded-2xl border-amber-200 bg-amber-50 hover:border-amber-300 hover:bg-amber-100"
                    >
                      <span className="text-xl">📆</span>
                      <p className="text-sm font-semibold text-amber-700">
                        Update availability
                      </p>
                      <p className="text-xs text-amber-600">
                        Keep your calendar current to appear in searches.
                      </p>
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="space-y-6">
                {filteredReservations.length === 0 ? (
                  <div className="px-6 py-8 text-sm text-center border border-dashed rounded-2xl border-amber-200 bg-amber-50/60 text-amber-700">
                    You don’t have any assigned visits right now. When plant owners book you, the details will appear here.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="px-4 py-4 space-y-3 border rounded-2xl border-amber-100 bg-amber-50/70"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-amber-800">
              <div>
                            <p className="font-semibold">
                              {ownerNames[extractId(reservation.owner_id)] ||
                                "Plant owner"}
                            </p>
                            <p className="text-xs text-amber-600">
                              {formatDateRange(
                                reservation.start_date,
                                reservation.end_date
                              )}
                            </p>
                        </div>
                          <div className="text-xs text-right text-amber-600">
                            Total payout: {" "}
                            <span className="font-semibold text-amber-700">
                              {formatCurrency(reservation.total_amount)}
                        </span>
                      </div>
                        </div>
                        
                        {reservation.special_notes && (
                          <p className="text-sm text-amber-700/90">
                            Owner note: {reservation.special_notes}
                          </p>
                        )}

                        <div className="px-4 py-3 space-y-2 rounded-xl bg-white/80">
                          <p className="text-xs font-semibold tracking-wide uppercase text-amber-600">
                            Daily checklist
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {reservation.care_checklist &&
                            reservation.care_checklist.length ? (
                              reservation.care_checklist.map((task) => (
                                <span
                                  key={`${reservation.id}-task-${task}`}
                                  className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium border rounded-full border-amber-200 bg-amber-50 text-amber-700"
                                >
                                  ▢ {task}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-amber-600/70">
                                Owner hasn’t shared a checklist yet.
                              </span>
                            )}
                          </div>
                        </div>

                        {reservation.care_updates &&
                          reservation.care_updates.length > 0 && (
                            <div className="px-4 py-3 rounded-xl bg-white/80">
                              <p className="text-xs font-semibold tracking-wide uppercase text-amber-600">
                                Latest update sent
                              </p>
                              {(() => {
                                const latest =
                                  reservation.care_updates?.[
                                    reservation.care_updates.length - 1
                                  ];
                                if (!latest) return null;
                                return (
                                  <div className="mt-1 space-y-1 text-xs text-amber-700">
                                    <p className="font-semibold text-amber-800">
                                      {formatDateTime(latest.date as any)}
                                    </p>
                                    <p className="text-amber-700/80">
                                      {latest.notes || "No notes provided."}
                                    </p>
                                    {latest.photos && latest.photos.length > 0 && (
                                      <p className="text-amber-600/70">
                                        {latest.photos.length} photo
                                        {latest.photos.length === 1 ? "" : "s"} shared
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                        <div className="flex flex-wrap items-center gap-2">
                          {renderActions(reservation)}
                        </div>
                      </div>
                    ))}
                </div>
                )}
              </div>
            )}


            {activeTab === "earnings" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="px-4 py-4 rounded-2xl bg-slate-50">
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">
                      This month
                    </h4>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(thisMonthEarnings)}
                    </p>
                    <p className="text-xs text-slate-500">
                      From {
                        reservations.filter((reservation) => {
                          if (!reservation.start_date) return false;
                          const reservationDate = parseDate(reservation.start_date);
                          const now = new Date();
                          return (
                            reservationDate &&
                            reservationDate.getMonth() === now.getMonth() &&
                            reservationDate.getFullYear() === now.getFullYear()
                          );
                        }).length
                      } reservation
                      {
                        reservations.filter((reservation) => {
                          if (!reservation.start_date) return false;
                          const reservationDate = parseDate(reservation.start_date);
                          const now = new Date();
                          return (
                            reservationDate &&
                            reservationDate.getMonth() === now.getMonth() &&
                            reservationDate.getFullYear() === now.getFullYear()
                          );
                        }).length === 1
                        ? ""
                        : "s"
                      } this month.
                    </p>
                  </div>
                  <div className="px-4 py-4 rounded-2xl bg-slate-50">
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">
                      Last month
                    </h4>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(lastMonthEarnings)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Based on reservations from the previous month.
                    </p>
                  </div>
                </div>
                
                        <div>
                  <h4 className="mb-3 text-sm font-semibold text-slate-700">
                    Recent transactions
                  </h4>
                  {recentTransactions.length === 0 ? (
                    <div className="px-4 py-6 text-sm bg-white border border-dashed rounded-2xl border-slate-200 text-slate-500">
                      Reservations will appear here with payment details and plant owner information.
                        </div>
                  ) : (
                    <div className="bg-white border divide-y divide-slate-200 rounded-2xl border-slate-200">
                      {recentTransactions.map(({ reservation }) => (
                        <div
                          key={reservation.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {ownerNames[extractId(reservation.owner_id)] ||
                                "Plant owner"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDateLong(reservation.start_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-amber-600">
                              +{formatCurrency(reservation.total_amount)}
                            </p>
                            <p className="text-xs text-amber-600/70">
                              {reservation.plants_info || "Plant care visit"}
                            </p>
                          </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Customer reviews
                  </h3>
                  <span className="text-xs font-semibold tracking-wide uppercase text-amber-600">
                    {stats.reviewCount} review{stats.reviewCount === 1 ? "" : "s"} received
                  </span>
                </div>

                {reviews.length === 0 ? (
                  <div className="px-4 py-6 text-sm bg-white border border-dashed rounded-2xl border-slate-200 text-slate-500">
                    Once plant owners leave feedback, you’ll see their notes and ratings here.
                  </div>
                ) : (
                <div className="space-y-4">
                    {reviews.map((reservation) => {
                      const rating = reservation.owner_rating ?? 0;
                      const reviewText =
                        reservation.owner_review ||
                        "Owner left a rating for this booking.";
                      return (
                        <div
                          key={reservation.id}
                          className="px-5 py-4 bg-white border shadow-sm rounded-2xl border-slate-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                        <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {ownerNames[extractId(reservation.owner_id)] ||
                                  "Plant owner"}
                              </p>
                              <div>
                                {[...Array(5)].map((_, index) => (
                              <span
                                    key={index}
                                    className={`text-sm ${
                                      index < rating
                                        ? "text-yellow-400"
                                        : "text-slate-300"
                                    }`}
                                  >
                                    ★
                              </span>
                            ))}
                          </div>
                        </div>
                            <p className="text-xs text-slate-500">
                              {formatDateLong(reservation.completed_at)}
                            </p>
                      </div>
                          <p className="mt-3 text-sm text-slate-700">
                            {reviewText}
                          </p>
                    </div>
                      );
                    })}
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
