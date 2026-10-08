type PaymentStatus = "paid" | "refunded" | "failed";

const PAYMENT_STYLES: Record<
  PaymentStatus,
  { label: string; prefix: string; classes: string }
> = {
  paid: {
    label: "Paid in full",
    prefix: "💳",
    classes: "bg-teal-50 text-teal-700 border border-teal-200",
  },
  refunded: {
    label: "Refunded",
    prefix: "↩️",
    classes: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  failed: {
    label: "Payment failed",
    prefix: "⚠️",
    classes: "bg-rose-50 text-rose-700 border border-rose-200",
  },
};

export default function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const style = PAYMENT_STYLES[status] ?? PAYMENT_STYLES.paid;;
  const composedClassName = `${"inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full"} ${style.classes}${
    className ? ` ${className}` : ""
  }`;

  return (
    <span className={composedClassName} role="status" aria-live="polite">
      <span aria-hidden>{style.prefix}</span>
      {style.label}
    </span>
  );
}
