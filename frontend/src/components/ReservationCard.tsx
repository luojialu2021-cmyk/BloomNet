import { Link } from "react-router-dom";
import { Calendar, MapPin, User, Leaf } from "lucide-react";
import type { Reservation } from "../api/types";
import ReservationStatusBadge from "./ReservationStatusBadge";
import PaymentStatusBadge from "./PaymentStatusBadge";

type ReservationCardProps = {
  reservation: Reservation;
  role: "owner" | "sitter";
  counterpartName?: string;
};

const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(startDate)} → ${formatter.format(endDate)}`;
};

export default function ReservationCard({
  reservation,
  role,
  counterpartName,
}: ReservationCardProps) {
  const reservationId =
    reservation.id || (reservation as any)._id || "reservation";
  const amount = reservation.total_amount.toFixed(2);
  const careUpdateCount = reservation.care_updates?.length ?? 0;

  return (
    <article className="flex flex-col gap-3 p-5 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 uppercase tracking-wide">
            <Leaf className="w-4 h-4 text-emerald-500" />
            {role === "owner" ? "Your plant sitter" : "Booking request"}
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {counterpartName || (role === "owner" ? "Sitter" : "Plant Owner")}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <div className="text-sm font-medium text-slate-500">Total</div>
          <div className="text-xl font-semibold text-slate-900">${amount}</div>
          <PaymentStatusBadge status={reservation.payment_status} className="mt-1" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ReservationStatusBadge status={reservation.status} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-500" />
          {formatDateRange(reservation.start_date, reservation.end_date)}
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-500" />
          {reservation.location_address}
        </span>
        {careUpdateCount > 0 && (
          <span className="inline-flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-500" />
            {careUpdateCount} care update{careUpdateCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="text-xs text-slate-500">Reservation ID: {reservationId}</div>
        <Link
          to={`/reservations/${reservationId}/detail`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
