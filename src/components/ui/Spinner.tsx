export function SpinnerDots() {
  return (
    <div aria-label="جارٍ التحميل" role="status" style={{ display: "inline-flex", gap: 6 }}>
      <Dot delayMs={0} />
      <Dot delayMs={120} />
      <Dot delayMs={240} />
    </div>
  );
}

function Dot(props: { delayMs: number }) {
  const { delayMs } = props;
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: "color-mix(in srgb, var(--primary) 70%, var(--muted))",
        display: "inline-block",
        animation: "dotPulse 900ms ease-in-out infinite",
        animationDelay: `${delayMs}ms`,
      }}
    />
  );
}

