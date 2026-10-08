import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { sitterService, reservationService, paymentService } from "../api/services";
import type { Reservation, SitterProfile,PaymentResponse } from "../api/types";
import { saveLocalReservation } from "../utils/localReservations";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

const FEATURED_SITTER_ID = "64f1f77bcf86cd7994390211";

const fallbackSitter: SitterProfile = {
  id: FEATURED_SITTER_ID,
  user_id: "64f1f77bcf86cd7994390112",
  name: "Sitter Test",
  email: "sittertest996@gmail.com", // Add email field
  tagline: "Reliable plant sitter for Homewood balconies",
  bio: "Hi! I'm a horticulture student focused on tropical plants and rare aroids. I love building customized watering schedules using moisture meters and smart alerts.",
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
  badges: ["Verified", "Background Checked"],
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
};

type FormState = {
  start_date: string;
  end_date: string;
  estimated_visits: number;
  plants_info: string;
  care_instructions: string;
  location_address: string;
  access_instructions: string;
  special_notes: string;
};

const formatISODate = (date: Date) => date.toISOString().split("T")[0];

const getDefaultForm = (start?: string | null, end?: string | null): FormState => {
  const today = new Date();
  const defaultStart = start || formatISODate(today);
  const endDate = end
    ? new Date(end)
    : new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
  const defaultEnd = formatISODate(endDate);

  return {
    start_date: defaultStart,
    end_date: defaultEnd,
    estimated_visits: 3,
    plants_info: "",
    care_instructions: "",
    location_address: "",
    access_instructions: "",
    special_notes: "",
  };
};

const calculateTotalVisits = (start: string, end: string, visits: number) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff =
    Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  return Math.max(visits, diff);
};

export default function Book() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const startQuery = query.get("start");
  const endQuery = query.get("end");
  const stripe = useStripe();
  const elements = useElements();
  const [sitter, setSitter] = useState<SitterProfile | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    getDefaultForm(startQuery, endQuery)
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sitter || !error) return;
    const timer = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [error, sitter]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const fetchSitter = async () => {
      setLoading(true);
      try {
        const res = await sitterService.getById(id);
        if (!mounted) return;

        if (res.data) {
          const sitterData = res.data;
          setSitter({
            ...sitterData,
            id: sitterData.id || (sitterData as any)._id,
          });
        } else if (id === FEATURED_SITTER_ID) {
          setSitter(fallbackSitter);
          setError(null);
        } else {
          setError(res.error || "Failed to load sitter info");
        }
      } catch (err) {
        if (id === FEATURED_SITTER_ID) {
          setSitter(fallbackSitter);
          setError(null);
        } else {
          setError("Failed to load sitter info");
        }
      }
      setLoading(false);
    };

    fetchSitter();

    return () => {
      mounted = false;
    };
  }, [id]);

  const totalAmount = useMemo(() => {
    if (!sitter) return 0;
    const visits = calculateTotalVisits(
      form.start_date,
      form.end_date,
      form.estimated_visits
    );
    return Number((sitter.price_per_visit * visits).toFixed(2));
  }, [sitter, form.start_date, form.end_date, form.estimated_visits]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "estimated_visits" ? Math.max(1, Number(value)) : value,
    }));
  };

  const dateError = useMemo(() => {
    if (!form.start_date || !form.end_date) return null;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    if (end <= start) {
      return "End date must be later than the start date.";
    }
    return null;
  }, [form.start_date, form.end_date]);

  const validateForm = (): string | null => {
    if (dateError) {
      return dateError;
    }
    if (!form.plants_info.trim() || !form.care_instructions.trim()) {
      return "Please describe your plants and care instructions.";
    }
    if (!form.location_address.trim()) {
      return "Please provide the care location address.";
    }
    return null;
  };

  const handleReservation = async () => {
    if (!id || !sitter) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!stripe || !elements) {
      setCreating(false);
      setError("Stripe is not ready. Please try again in a moment.");
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setCreating(false);
      setError("Payment element not found. Please reload the page.");
      return;
    }
    setCreating(true);
    setError(null);
    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
      billing_details: {
        name: (localStorage.getItem("auth_username") as string) || undefined,
        email: (localStorage.getItem("auth_email") as string) || undefined,
      },
    });
    if (pmError || !paymentMethod) {
      setCreating(false);
      setError(pmError?.message || "Failed to create payment method.");
      return;
    }
    const sitterId = sitter.id || (sitter as any)._id;
    const sitterUserId = sitter.user_id || sitterId;
    try {
      const payData = await paymentService.pay(totalAmount, paymentMethod.id);

      if (payData.data?.status !== "success") {
        const serverError =
            payData.data?.error ||
            payData.error ||
            "Payment failed. Please try again.";
        console.error("Payment failed:", serverError);
        setError(serverError);
        return;
      }

      const reservationPayload = {
        sitter_id: sitterId,
        sitter_name: sitter.name,
        sitter_email: sitter.email, // Add sitter email for matching
        sitter_profile_id: sitterId,
        start_date: form.start_date,
        end_date: form.end_date,
        total_amount: totalAmount,
        plants_info: form.plants_info.trim(),
        care_instructions: form.care_instructions.trim(),
        location_address: form.location_address.trim(),
        access_instructions: form.access_instructions.trim() || undefined,
        special_notes: form.special_notes.trim() || undefined,
      };

      const res = await reservationService.create(reservationPayload);
      if (!res.data) {
        setCreating(false);
        const errorMessage = res.error || "Failed to create reservation";

        if (errorMessage.toLowerCase().includes("failed to fetch") || errorMessage.toLowerCase().includes("sitter not found")) {
          const now = new Date().toISOString();
          const localReservationId = `local-${Date.now()}`;
          let ownerId = "local-owner";
          let ownerName = localStorage.getItem("auth_username") || "Plant Parent";
          let ownerEmail = localStorage.getItem("auth_email") || "";

          try {
            const storedUser = localStorage.getItem("userInfo");
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              ownerId = parsed?.user_id || parsed?.id || ownerId;
              ownerName = parsed?.name || parsed?.full_name || ownerName;
              ownerEmail = parsed?.email || ownerEmail;
            }
          } catch (storageError) {
            console.warn("Unable to read user info from storage", storageError);
          }

          const localReservation: Reservation = {
            id: localReservationId,
            owner_id: ownerId,
            sitter_id: sitterUserId,
            sitter_name: sitter.name,
            sitter_email: sitter.email, // Add sitter email for matching
            sitter_profile_id: sitterId,
            listing_id: undefined,
            start_date: form.start_date,
            end_date: form.end_date,
            total_amount: totalAmount,
            plants_info: form.plants_info.trim(),
            care_instructions: form.care_instructions.trim(),
            location_address: form.location_address.trim(),
            access_instructions: form.access_instructions.trim() || undefined,
            status: "confirmed",
            payment_status: "paid",
            care_updates: [],
            care_checklist: [],
            special_notes: form.special_notes.trim() || undefined,
            owner_notes: undefined,
            sitter_notes: undefined,
            created_at: now,
            updated_at: now,
            confirmed_at: undefined,
            started_at: undefined,
            completed_at: undefined,
            owner_rating: undefined,
            sitter_rating: undefined,
            owner_review: undefined,
            sitter_review: undefined,
          };

          saveLocalReservation({
            reservation: localReservation,
            sitterSnapshot: {
              id: sitterUserId,
              name: sitter.name,
              email: sitter.email, // Add sitter email
              price_per_visit: sitter.price_per_visit,
              service_areas: sitter.service_areas,
              profile_id: sitterId,
            },
            ownerSnapshot: {
              id: ownerId,
              name: ownerName,
              email: ownerEmail,
            },
          });

          navigate(`/reservation-confirmation/${localReservationId}?offline=1`);
          return;
        }

        setError(errorMessage);
        return;
      }

      const createdReservation = res.data;
      const reservationId =
          createdReservation.id || (createdReservation as any)._id;
      navigate(`/reservation-confirmation/${reservationId}`);

    }
    catch (fetchErr) {
      console.error("Payment request error:", fetchErr);
      setError("Payment request failed. Please try again.");
    }
    finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-3xl px-4 py-12 mx-auto">
        <div className="text-center text-slate-500">Loading sitter info…</div>
      </main>
    );
  }

  if (error && !sitter) {
    return (
      <main className="max-w-3xl px-4 py-12 mx-auto">
        <div className="text-center text-red-600">{error}</div>
      </main>
    );
  }

  if (!sitter) {
    return (
      <main className="max-w-3xl px-4 py-12 mx-auto">
        <div className="text-center text-slate-500">Sitter not found.</div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl px-4 py-10 mx-auto space-y-8">
      <section className="p-6 bg-white border shadow-sm rounded-3xl border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">
          Book {sitter.name}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          ${sitter.price_per_visit.toFixed(2)} per visit •{" "}
          {(sitter.service_areas || []).join(", ") || "Baltimore area"}
        </p>
      </section>

      <section className="p-6 space-y-6 bg-white border shadow-sm rounded-3xl border-slate-200">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Reservation details
            </h2>
            <p className="text-sm text-slate-500">
              Tell your sitter what your plants need while you are away.
            </p>
          </div>
        </header>

        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleReservation();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700">Start date</span>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleInputChange}
                className={`px-3 py-2 border rounded-xl ${
                  dateError ? "border-rose-300" : "border-slate-200"
                }`}
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700">End date</span>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleInputChange}
                min={form.start_date}
                className={`px-3 py-2 border rounded-xl ${
                  dateError ? "border-rose-300" : "border-slate-200"
                }`}
                required
              />
              {dateError && (
                <span className="text-xs font-medium text-rose-600">
                  {dateError}
                </span>
              )}
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700">
                Estimated visits
              </span>
              <input
                type="number"
                name="estimated_visits"
                min={1}
                value={form.estimated_visits}
                onChange={handleInputChange}
                className="px-3 py-2 border rounded-xl border-slate-200"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700">
                Plant overview
              </span>
              <textarea
                name="plants_info"
                value={form.plants_info}
                onChange={handleInputChange}
                rows={3}
                placeholder="E.g. 5 indoor tropical plants, 2 balcony herbs…"
                className="px-3 py-2 border rounded-xl border-slate-200"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700">
                Care instructions
              </span>
              <textarea
                name="care_instructions"
                value={form.care_instructions}
                onChange={handleInputChange}
                rows={3}
                placeholder="Water every morning, mist leaves lightly, check soil moisture…"
                className="px-3 py-2 border rounded-xl border-slate-200"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700">
                Location address
              </span>
              <input
                name="location_address"
                value={form.location_address}
                onChange={handleInputChange}
                placeholder="123 Wyman Park Dr, Baltimore, MD 21211"
                className="px-3 py-2 border rounded-xl border-slate-200"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700">
                Access instructions (optional)
              </span>
              <input
                name="access_instructions"
                value={form.access_instructions}
                onChange={handleInputChange}
                placeholder="Door code, key location, concierge desk…"
                className="px-3 py-2 border rounded-xl border-slate-200"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-700">
              Special notes (optional)
            </span>
            <textarea
              name="special_notes"
              value={form.special_notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Anything else your sitter should keep in mind."
              className="px-3 py-2 border rounded-xl border-slate-200"
            />
          </label>

          <div className="border rounded-xl p-4 bg-slate-50">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment details
              </label>
              <CardElement
                options={{
                  style: {
                    base: { fontSize: "16px", color: "#32325d" },
                    invalid: { color: "#fa755a" },
                  },
                }}
              />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-2xl bg-emerald-50 border-emerald-100">
            <div>
              <div className="text-sm font-medium text-emerald-700">
                Reservation total
              </div>
              <div className="text-2xl font-semibold text-emerald-900">
                ${totalAmount.toFixed(2)}
              </div>
              <p className="text-xs text-emerald-700/70">
                Includes {calculateTotalVisits(
                  form.start_date,
                  form.end_date,
                  form.estimated_visits
                )}{" "}
                visits at ${sitter.price_per_visit.toFixed(2)} each.
              </p>

            </div>

            <button
              type="submit"
              disabled={creating || Boolean(dateError)}
              className="px-6 py-3 text-sm font-semibold text-white shadow rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? "Booking…" : "Confirm booking request"}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 text-sm border rounded-2xl border-rose-200 bg-rose-50 text-rose-700">
            {error}
          </div>
        )}
      </section>

    </main>
  );
}
