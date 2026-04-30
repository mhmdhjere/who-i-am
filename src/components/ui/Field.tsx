"use client";

import type { InputHTMLAttributes, PropsWithChildren, TextareaHTMLAttributes } from "react";

export function Field(props: PropsWithChildren<{ label: string; hint?: string }>) {
  const { label, hint, children } = props;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <label>{label}</label>
        {hint ? <div className="muted">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

