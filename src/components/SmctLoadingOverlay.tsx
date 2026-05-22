/** Spinner + SMCT logo over card/table content while data loads or refreshes. */
export default function SmctLoadingOverlay({ label }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center rounded-lg bg-white/55 backdrop-blur-[1px]"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="pointer-events-none flex flex-col items-center gap-3 rounded-lg bg-white/90 px-8 py-6 shadow-lg ring-1 ring-gray-200/80">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/smct.png"
              alt=""
              className="h-10 w-10 object-contain"
              width={40}
              height={40}
              decoding="async"
            />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-600">{label ?? "Loading..."}</p>
      </div>
    </div>
  );
}
