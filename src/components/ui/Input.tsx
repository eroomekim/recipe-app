interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full border border-gray-500 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-black transition-colors ${error ? "border-red" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 font-sans text-sm text-red-dark">{error}</p>
      )}
    </div>
  );
}
