export default function AdminLoading(): React.JSX.Element {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-7xl space-y-5">
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-4 w-72 max-w-full rounded bg-gray-100" />
        <div className="h-20 rounded-xl border border-gray-200 bg-white" />
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-10 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
