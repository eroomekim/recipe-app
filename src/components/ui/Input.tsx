interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = "",
  ...props
}: InputProps) {
  return (
    <div>
      {label && (
        <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full border border-gray-300 px-4 py-3 font-sans text-base text-black placeholder:text-gray-500 focus:outline-none focus:border-black transition-colors ${error ? "border-red" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 font-sans text-sm text-red">{error}</p>
      )}
    </div>
  );
}
