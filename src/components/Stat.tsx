"use client";

import { ReactNode } from "react";

interface StatProps {
  label: string;
  value: string | number | null | undefined;
  emptyState?: ReactNode;
  color?: string;
  prefix?: string;
  suffix?: string;
  onClick?: () => void;
}

/**
 * Unified Stat component for all stat displays.
 * Replaces bare "—" placeholders with contextual empty states.
 * Always uses tabular-nums for numeric values to prevent layout shift.
 */
export function Stat({ 
  label, 
  value, 
  emptyState,
  color,
  prefix,
  suffix,
  onClick,
}: StatProps) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const displayValue = hasValue ? (
    <>
      {prefix && <span style={{ color: "var(--muted)" }}>{prefix} </span>}
      <span style={{ fontFamily: "var(--font-display)", color: color || "var(--gold)" }}>
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </span>
      {suffix && <span style={{ color: "var(--muted)" }}> {suffix}</span>}
    </>
  ) : (
    <span style={{ color: "var(--muted)" }}>
      {emptyState || "—"}
    </span>
  );

  return (
    <div 
      className="stat-tile" 
      onClick={onClick}
      style={{ 
        cursor: onClick ? "pointer" : "default",
        fontFamily: "var(--font-display)",
      }}
    >
      <div 
        className="k" 
        style={{ 
          fontFamily: "var(--font-body)", 
          fontVariantNumeric: "tabular-nums",
          fontSize: "10px", 
          letterSpacing: "1.2px", 
          textTransform: "uppercase", 
          color: "var(--muted)" 
        }}
      >
        {label}
      </div>
      <div 
        className="v" 
        style={{ 
          fontFamily: "var(--font-display)", 
          fontVariantNumeric: "tabular-nums",
          fontSize: "22px", 
          marginTop: "4px",
          color: color || "var(--gold)",
        }}
      >
        {displayValue}
      </div>
    </div>
  );
}
