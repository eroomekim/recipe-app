"use client";

interface TagProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function Tag({ label, active = false, onClick }: TagProps) {
  const base =
    "inline-flex items-center px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer select-none";
  const styles = active
    ? "bg-black text-white"
    : "bg-gray-50 text-gray-600 hover:bg-gray-200";

  return (
    <span className={`${base} ${styles}`} onClick={onClick} role="button">
      {label}
    </span>
  );
}
