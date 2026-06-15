export function FlashMessage({
  message,
  variant = "success",
}: {
  message: string;
  variant?: "success" | "error";
}) {
  if (!message) return null;

  const classes =
    variant === "error"
      ? "bg-[var(--red-dim)] text-[var(--red)]"
      : "bg-[var(--green-dim)] text-[var(--green)]";

  return (
    <div className={`mb-4 p-3 rounded-[var(--r-sm)] text-sm ${classes}`}>{message}</div>
  );
}

export function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card p-6 text-center max-w-md mx-auto">
      <p className="text-[var(--red)] mb-4">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
