import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { reservationService, authService } from "../api/services";
import type { Reservation, User } from "../api/types";
import ReservationCard from "../components/ReservationCard";
import ReservationStatusBadge from "../components/ReservationStatusBadge";
import ReviewModel from "../components/ReviewModel";
import {
  getLocalReservationRecord,
  listLocalReservationRecords,
  removeLocalReservation,
  isLocalReservationId,
} from "../utils/localReservations";
import { useOwnerAuth } from "../contexts/AuthContext";

type StatusFilter = "all" | "active" | "finished";

const STATUS_FILTERS: Record<
  StatusFilter,
  { label: string; predicate: (status: Reservation["status"]) => boolean }
> = {
  all: { label: "All", predicate: () => true },
  active: {
    label: "Active",
    predicate: (status) => ["confirmed", "in_progress"].includes(status),
  },
  finished: {
    label: "Finished",
    predicate: (status) => ["completed", "cancelled"].includes(status),
  },
};

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
      const stringified = record.toString();
      const objectIdMatch = /^ObjectId\("([^"]+)"\)$/.exec(stringified);
      if (objectIdMatch) return objectIdMatch[1];
      if (stringified !== "[object Object]") return stringified;
    }
  }
  return "";
};

const normalizeReservation = (
  reservation: Reservation | Record<string, any>
): Reservation => {
  const base = reservation as Record<string, any>;
  const listingId = base.listing_id ? extractId(base.listing_id) : undefined;
  const sitterProfileId = base.sitter_profile_id
    ? extractId(base.sitter_profile_id)
    : undefined;

  return {
    ...(reservation as Reservation),
    id: extractId(base.id ?? base._id),
    owner_id: extractId(base.owner_id),
    sitter_id: extractId(base.sitter_id),
    ...(sitterProfileId ? { sitter_profile_id: sitterProfileId } : {}),
    ...(listingId ? { listing_id: listingId } : {}),
  };
};

export default function ReservationsPage() {
  const navigate = useNavigate();
  const { user: authUser, token } = useOwnerAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const reservationsWithLocal = useMemo(() => {
    const map = new Map<string, Reservation>();
    reservations.forEach((reservation) => {
      map.set(reservation.id, reservation);
    });
    const localRecords = listLocalReservationRecords();
    console.log('Local reservation records:', localRecords); // Debug log
    localRecords.forEach((record) => {
      const normalized = normalizeReservation(record.reservation);
      if (!map.has(normalized.id)) {
        map.set(normalized.id, normalized);
      }
    });
    const allReservations = Array.from(map.values());
    console.log('All reservations (API + Local):', allReservations); // Debug log
    return allReservations;
  }, [reservations]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(null);
  const [reviewModel, setReviewModel] = useState<{
    isOpen: boolean;
    reservation: Reservation | null;
    isOwnerRating: boolean;
  }>({
    isOpen: false,
    reservation: null,
    isOwnerRating: true,
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [localOwnerMap, setLocalOwnerMap] = useState<Record<string, string>>({});

  const currentUserId = useMemo(() => {
    const candidateValues = [
      (currentUser as any)?.id,
      (currentUser as any)?.user_id,
      (currentUser as any)?._id,
      localStorage.getItem("auth_user_id"),
    ];
    for (const value of candidateValues) {
      const id = extractId(value);
      if (id) return id;
    }
    return "";
  }, [currentUser]);

  const applyLocalUserNames = useCallback((reservationsList: Reservation[]) => {
    const updates: Record<string, string> = {};
    const ownerAssociations: Record<string, string> = {};
    reservationsList.forEach((reservation) => {
      const snapshot = getLocalReservationRecord(reservation.id || (reservation as any)._id || "");
      if (!snapshot) return;
      if (snapshot.ownerSnapshot) {
        updates[snapshot.ownerSnapshot.id] = snapshot.ownerSnapshot.name;
        ownerAssociations[reservation.id] = extractId(snapshot.ownerSnapshot.id);
      }
      if (snapshot.sitterSnapshot) {
        updates[snapshot.sitterSnapshot.id] = snapshot.sitterSnapshot.name;
      }
    });
    if (Object.keys(updates).length) {
      setUserNames((prev) => ({ ...updates, ...prev }));
    }
    if (Object.keys(ownerAssociations).length) {
      setLocalOwnerMap((prev) => ({ ...prev, ...ownerAssociations }));
    }
  }, []);

  useEffect(() => {
    const localRecords = listLocalReservationRecords();
    if (!localRecords.length) return;
    setReservations((prev) => {
      if (prev.length) {
        return prev;
      }
      const normalized = localRecords.map((record) =>
        normalizeReservation(record.reservation)
      );
      applyLocalUserNames(normalized);
      return normalized;
    });
  }, [applyLocalUserNames]);


  useEffect(() => {
    const records = listLocalReservationRecords();
    if (!records.length) return;
    const updates: Record<string, string> = {};
    const ownerAssociations: Record<string, string> = {};
    records.forEach((record) => {
      if (record.ownerSnapshot) {
        updates[record.ownerSnapshot.id] = record.ownerSnapshot.name;
        ownerAssociations[record.reservation.id] = extractId(record.ownerSnapshot.id);
      }
      if (record.sitterSnapshot) {
        updates[record.sitterSnapshot.id] = record.sitterSnapshot.name;
      }
    });
    if (Object.keys(updates).length) {
      setUserNames((prev) => ({ ...updates, ...prev }));
    }
    if (Object.keys(ownerAssociations).length) {
      setLocalOwnerMap((prev) => ({ ...ownerAssociations, ...prev }));
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      // Check if user is authenticated using the new auth system
      if (!token) {
        console.log('No token found, user not authenticated');
        setLoading(false);
        // Don't redirect, just show empty state - user might have local reservations
        const localRecords = listLocalReservationRecords();
        if (localRecords.length > 0) {
          console.log('Found local reservations, loading them');
          const list = localRecords.map((record) => normalizeReservation(record.reservation));
          setReservations(list);
          applyLocalUserNames(list);
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [userRes, reservationsRes] = await Promise.all([
          authService.getCurrentUser(),
          reservationService.getMyReservations(),
        ]);

        if (!mounted) return;

        console.log('User response:', userRes);
        console.log('Reservations response:', reservationsRes);

        if (userRes.data) {
          const userData = userRes.data as User;
          setCurrentUser(userData);
          console.log('Current user loaded:', userData);
          const normalizedId = extractId(
            (userData as any)?.id ??
              (userData as any)?._id ??
              (userData as any)?.user_id
          );
          if (normalizedId) {
            localStorage.setItem("auth_user_id", normalizedId);
          }
        } else if (userRes.error) {
          if (userRes.status === 401) {
            localStorage.removeItem("auth_token");
            navigate("/login");
            return;
          }
          if (userRes.error.toLowerCase().includes("failed to fetch")) {
            const storedUser = localStorage.getItem("userInfo");
            if (storedUser) {
              try {
                const parsed = JSON.parse(storedUser);
                setCurrentUser(parsed as User);
                const storedId = extractId(
                  (parsed as any)?.id ??
                    (parsed as any)?._id ??
                    (parsed as any)?.user_id
                );
                if (storedId) {
                  localStorage.setItem("auth_user_id", storedId);
                }
              } catch (storageError) {
                console.warn("Unable to parse stored user info", storageError);
              }
            }
          } else {
            setError(userRes.error);
          }
        }

        if (reservationsRes.data) {
          const apiList = (reservationsRes.data as Reservation[]).map((r) =>
            normalizeReservation(r)
          );
          const localRecords = listLocalReservationRecords();
          const merged = [...apiList];
          if (localRecords.length) {
            const existing = new Set(apiList.map((item) => item.id));
            localRecords.forEach((record) => {
              const normalized = normalizeReservation(record.reservation);
              if (!existing.has(normalized.id)) {
                merged.push(normalized);
              }
            });
          }
          setReservations(merged);
          applyLocalUserNames(merged);
        } else if (reservationsRes.error) {
          if (reservationsRes.status === 401) {
            localStorage.removeItem("auth_token");
            navigate("/login");
            return;
          }
          if (reservationsRes.error.toLowerCase().includes("failed to fetch")) {
            // rely on local reservations handled below
          } else {
            setError(reservationsRes.error);
          }
        }

        if (!reservationsRes.data) {
          const localRecords = listLocalReservationRecords();
          if (localRecords.length) {
            const list = localRecords.map((record) =>
              normalizeReservation(record.reservation)
            );
            setReservations(list);
            applyLocalUserNames(list);
          }
        }

        const localRecordsFallback = listLocalReservationRecords();
        if (localRecordsFallback.length) {
          const localNormalized = localRecordsFallback.map((record) =>
            normalizeReservation(record.reservation)
          );
          setReservations((prev) => {
            const existing = new Set(prev.map((item) => item.id));
            const additions = localNormalized.filter((item) => !existing.has(item.id));
            if (additions.length === 0) {
              return prev;
            }
            const next = [...prev, ...additions];
            applyLocalUserNames(next);
            return next;
          });
        }
      } catch (err: any) {
        if (!mounted) return;
        console.error('Reservations fetch error:', err);
        setError(err?.message || "Unable to load reservations");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [applyLocalUserNames, navigate, token]);

  useEffect(() => {
    if (!reservations.length) return;

    const ids = new Set<string>();
    reservations.forEach((r) => {
      if (r.owner_id) ids.add(r.owner_id);
      if (r.sitter_id) ids.add(r.sitter_id);
    });
    const missingIds = Array.from(ids).filter((id) => !userNames[id]);
    if (missingIds.length === 0) return;

    let cancelled = false;
    const loadUsers = async () => {
      const entries: [string, string][] = [];
      for (const uid of missingIds) {
        const response = await authService.getUserById(uid);
        if (response.data) {
          const user = response.data as User;
          entries.push([
            uid,
            user.full_name || user.email || `User ${uid.slice(-5)}`,
          ]);
        } else {
          entries.push([uid, `User ${uid.slice(-5)}`]);
        }
      }
      if (!cancelled && entries.length) {
        setUserNames((prev) => {
          const next = { ...prev };
          for (const [id, name] of entries) {
            next[id] = name;
          }
          return next;
        });
      }
    };

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [reservations, userNames]);

  const ownerReservations = useMemo(() => {
    if (!currentUserId) {
      return reservationsWithLocal.slice();
    }

    return reservationsWithLocal.filter((reservation) => {
      const candidateOwnerId =
        reservation.owner_id || localOwnerMap[reservation.id];
      const normalizedOwnerId = extractId(candidateOwnerId);

      if (
        isLocalReservationId(reservation.id) &&
        (!normalizedOwnerId || normalizedOwnerId === "local-owner")
      ) {
        return true;
      }

      return normalizedOwnerId === currentUserId;
    });
  }, [reservationsWithLocal, currentUserId, localOwnerMap]);

  const filterPredicate = STATUS_FILTERS[statusFilter].predicate;
  const filteredOwner = ownerReservations.filter((r) => filterPredicate(r.status));

  const ownerCount = ownerReservations.length;
  const showOwnerSection = true;
  const hasAnyReservations = ownerCount > 0;

  // Sitter section placeholders (current page focuses on owner reservations)
  const showSitterSection = false;
  const filteredSitter: Reservation[] = [];

  const handleCancelReservation = async (reservationId: string) => {
    const confirmCancel = window.confirm(
      "Cancel this reservation? This action cannot be undone."
    );
    if (!confirmCancel) {
      return;
    }

    const isLocal = isLocalReservationId(reservationId);
    const reason = isLocal
      ? undefined
      : window.prompt(
          "Optional: let your sitter know why you’re cancelling (leave blank to skip)."
        ) || undefined;

    setBusyReservationId(reservationId);
    setActionMessage(null);

    if (isLocal) {
      removeLocalReservation(reservationId);
      setReservations((prev) =>
        prev.filter((reservation) => reservation.id !== reservationId)
      );
      setBusyReservationId(null);
      setActionMessage("Reservation cancelled.");
      return;
    }

    try {
      const response = await reservationService.cancel(reservationId, reason);
      setBusyReservationId(null);

      if (response.error) {
        setActionMessage(
          typeof response.error === "string"
            ? response.error
            : JSON.stringify(response.error)
        );
        return;
      }

      removeLocalReservation(reservationId);
      setReservations((prev) =>
        prev.filter((reservation) => reservation.id !== reservationId)
      );
      setActionMessage("Reservation cancelled.");
    } catch (error: any) {
      setBusyReservationId(null);
      setActionMessage(error?.message || "Unable to cancel reservation.");
    }
  };

  const handleRateReservation = (reservation: Reservation, isOwnerRating: boolean) => {
    setReviewModel({
      isOpen: true,
      reservation,
      isOwnerRating,
    });
  };

  const handleSubmitReview = async (rating: number, review: string) => {
    if (!reviewModel.reservation) return;

    setIsSubmittingReview(true);
    try {
      const response = await reservationService.rate(
        reviewModel.reservation.id as string,
        rating,
        review
      );

      if (response.error) {
        throw new Error(response.error);
      }

      // Refresh reservations to show updated ratings
      const refreshed = await reservationService.getMyReservations();
      if (refreshed.data) {
        const list = (refreshed.data as Reservation[]).map((r) => ({
          ...r,
          id: r.id || (r as any)._id,
        }));
        setReservations(list);
      }

      setActionMessage("Thank you for your review!");
    } catch (error) {
      setActionMessage("Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const canRateReservation = (reservation: Reservation, isOwnerRating: boolean) => {
    if (reservation.status !== "completed") return false;
    
    if (isOwnerRating) {
      return !reservation.owner_rating;
    } else {
      return !reservation.sitter_rating;
    }
  };

  return (
    <main className="max-w-6xl px-4 py-10 mx-auto space-y-8">
      <section className="p-6 bg-white border shadow-sm border-slate-200 rounded-3xl">
        <h1 className="text-2xl font-semibold text-slate-900">
          Reservations summary
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {(Object.keys(STATUS_FILTERS) as StatusFilter[]).map((value) => {
            const { label } = STATUS_FILTERS[value];
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                  statusFilter === value
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <section className="p-4 text-sm border border-rose-200 bg-rose-50 text-rose-600 rounded-2xl">
          {error}
        </section>
      )}
      {actionMessage && (
        <section className="p-4 text-sm border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-2xl">
          {actionMessage}
        </section>
      )}

      {showOwnerSection && (
        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Bookings you created
              </h2>
              <p className="text-sm text-slate-500">
                Manage reservations where you are the plant owner.
              </p>
              <p className="mt-3 text-xs font-semibold tracking-wide uppercase text-slate-500">
                Status legend
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                {(["in_progress", "completed", "cancelled"] as Reservation["status"][]).map(
                  (status) => (
                    <ReservationStatusBadge key={status} status={status} />
                  )
                )}
              </div>
            </div>
            <button
              onClick={() => navigate("/search")}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Find a sitter
            </button>
          </header>

          {loading ? (
            <div className="p-6 text-center bg-white border text-slate-500 rounded-3xl border-slate-200">
              Loading your reservations…
            </div>
          ) : filteredOwner.length === 0 ? (
            <div className="p-6 text-center bg-white border text-slate-500 rounded-3xl border-slate-200">
              No reservations yet. When you book a sitter, it will appear here.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredOwner.map((reservation) => (
                <div key={reservation.id} className="space-y-3">
                  <ReservationCard
                    reservation={reservation}
                    role="owner"
                    //counterpartName={userNames[reservation.sitter_id]}
                      counterpartName={(reservation as any).sitter_name || userNames[reservation.sitter_id]}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {["confirmed", "in_progress"].includes(
                      reservation.status
                    ) && (
                      <button
                        onClick={() =>
                          handleCancelReservation(reservation.id as string)
                        }
                        disabled={busyReservationId === reservation.id}
                        className="px-4 py-2 text-sm font-semibold border text-rose-600 bg-rose-50 border-rose-200 rounded-xl hover:bg-rose-100 disabled:opacity-60"
                      >
                        {busyReservationId === reservation.id
                          ? "Cancelling..."
                          : "Cancel reservation"}
                      </button>
                    )}
                    {canRateReservation(reservation, true) && (
                      <button
                        onClick={() => handleRateReservation(reservation, true)}
                        className="px-4 py-2 text-sm font-semibold text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200"
                      >
                        Rate sitter
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (reservation.id === 'dummy_completed_owner_reservation') {
                          window.alert('This is a demo reservation for rating showcase only.');
                          return;
                        }
                        navigate(`/reservations/${reservation.id}/detail`);
                      }}
                      className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-xl hover:bg-emerald-200"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showSitterSection && (
        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Requests for you to sit
              </h2>
              <p className="text-sm text-slate-500">
                Track active plant care commitments.
              </p>
            </div>
          </header>

          {loading ? (
            <div className="p-6 text-center bg-white border text-slate-500 rounded-3xl border-slate-200">
              Loading sitter reservations…
            </div>
          ) : filteredSitter.length === 0 ? (
            <div className="p-6 text-center bg-white border text-slate-500 rounded-3xl border-slate-200">
              No sitter reservations right now.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSitter.map((reservation) => (
                <div key={reservation.id} className="space-y-3">
                  <ReservationCard
                    reservation={reservation}
                    role="sitter"
                    counterpartName={userNames[reservation.owner_id]}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {reservation.status === 'completed' && (
                      canRateReservation(reservation, false) ? (
                        <button
                          onClick={() => handleRateReservation(reservation, false)}
                          className="px-4 py-2 text-sm font-semibold transition-colors cursor-pointer text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200"
                        >
                          Rate owner
                        </button>
                      ) : reservation.sitter_rating ? (
                        <span className="px-4 py-2 text-sm font-medium cursor-default text-emerald-700 bg-emerald-100 rounded-xl">
                          ✓ Rated
                        </span>
                      ) : null
                    )}
                    <button
                      onClick={() => {
                        if (reservation.id === 'dummy_completed_owner_reservation') {
                          window.alert('This is a demo reservation for rating showcase only.');
                          return;
                        }
                        navigate(`/reservations/${reservation.id}/detail`);
                      }}
                      className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-xl hover:bg-emerald-200"
                    >
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!hasAnyReservations && !loading && (
        <section className="p-6 text-center bg-white border text-slate-500 rounded-3xl border-slate-200">
          You don’t have any reservations yet. Book a sitter or accept a job to
          see it here.
        </section>
      )}

      {/* Review Model */}
      {reviewModel.reservation && (
        <ReviewModel
          isOpen={reviewModel.isOpen}
          onClose={() => setReviewModel({ isOpen: false, reservation: null, isOwnerRating: true })}
          onSubmit={handleSubmitReview}
          reservationId={reviewModel.reservation.id as string}
          sitterName={userNames[reviewModel.reservation.sitter_id] || "Sitter"}
          ownerName={userNames[reviewModel.reservation.owner_id] || "Owner"}
          startDate={reviewModel.reservation.start_date}
          endDate={reviewModel.reservation.end_date}
          isOwnerRating={reviewModel.isOwnerRating}
          isSubmitting={isSubmittingReview}
        />
      )}
    </main>
  );
}