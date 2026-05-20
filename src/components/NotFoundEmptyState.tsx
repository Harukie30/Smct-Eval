import { cn } from "@/lib/utils";

const NOT_FOUND_IMG_STYLE = {
  imageRendering: "auto",
  willChange: "auto",
  transform: "translateZ(0)",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
} as const;

type NotFoundEmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export default function NotFoundEmptyState({
  title,
  description,
  className,
}: NotFoundEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-8",
        className
      )}
    >
      <img
        src="/not-found.gif"
        alt="No data"
        className="w-25 h-25 object-contain"
        style={NOT_FOUND_IMG_STYLE}
      />
      <div className="text-gray-500 text-center">
        <p className="text-base font-medium mb-1">{title}</p>
        {description ? (
          <p className="text-sm text-gray-400">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
