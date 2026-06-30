"use client";

type StatPercentRingProps = {
  percent: number;
  label: string;
  detail: string;
  color: string;
};

export function formatStatPercent(value: number): string {
  const clamped = Math.min(100, Math.max(0, value));
  return Number.isInteger(clamped) ? String(clamped) : clamped.toFixed(1);
}

export function StatPercentRing({
  percent,
  label,
  detail,
  color,
}: StatPercentRingProps) {
  const size = 76;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums text-gray-900">
            {formatStatPercent(clamped)}%
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-800">{label}</p>
      <p className="max-w-[7.5rem] text-[0.65rem] leading-snug text-gray-500">
        {detail}
      </p>
    </div>
  );
}
