import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg =
    type === "success"
      ? "bg-green-600"
      : type === "error"
        ? "bg-brand-red"
        : "bg-dark-surface";

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
      <div
        className={`${bg} text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2`}
      >
        {type === "success" && (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {message}
      </div>
    </div>
  );
}
