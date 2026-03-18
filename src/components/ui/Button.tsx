"use client";

import Spinner from "./Spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base = "font-sans text-base font-semibold px-8 py-3 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-black text-white hover:bg-gray-900",
    secondary: "bg-white text-black border border-black hover:bg-gray-50",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
