import type { CSSProperties } from "react";

export function ProgressBar(props: { value: number; label?: string }) {
  const { value, label } = props;
  const v = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const style = { width: `${Math.round(v * 100)}%` } satisfies CSSProperties;

  return (
    <div className="stack" style={{ gap: 8 }}>
      {label ? <div className="muted">{label}</div> : null}
      <div className="progressTrack" aria-hidden="true">
        <div className="progressFill" style={style} />
      </div>
    </div>
  );
}

