type ReservationStatus =
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

const STATUS_STYLES: Record<
  ReservationStatus,
  { label: string; classes: string }
> = {
  confirmed: {
    label: "Scheduled",
    classes: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  in_progress: {
    label: "Visit in progress",
    classes: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  completed: {
    label: "Completed",
    classes: "bg-violet-100 text-violet-700 border border-violet-200",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-rose-100 text-rose-700 border border-rose-200",
  },
  expired: {
    label: "Expired",
    classes: "bg-slate-100 text-slate-600 border border-slate-200",
  },
};

export default function ReservationStatusBadge({
  status,
  className,
}: {
  status: ReservationStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.confirmed;
  const composedClassName = `${"inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full"} ${style.classes}${
    className ? ` ${className}` : ""
  }`;
  return (
    <span
      className={composedClassName}
    >
      {style.label}
    </span>
  );
}
