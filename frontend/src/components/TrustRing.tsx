interface TrustRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  variant?: "teal" | "agent";
}

export default function TrustRing({
  score,
  size = 96,
  strokeWidth = 8,
  label,
  sublabel,
  variant = "teal",
}: TrustRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Score"}: ${clamped} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="trust-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={`trust-ring-fill ${variant === "agent" ? "agent" : ""}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-medium text-text leading-none">
          {clamped}
        </span>
        {sublabel && (
          <span className="text-[10px] text-muted mt-1 tracking-wide uppercase">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
