export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
