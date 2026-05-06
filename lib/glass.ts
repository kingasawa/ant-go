import type { CSSProperties } from "react";

// Flat card — tự động adapt dark/light via CSS variables
export const GLASS: CSSProperties = {
  background: "var(--dash-card)",
  border: "1px solid var(--dash-card-border)",
};

// Modal / drawer — solid background, float trên overlay
export const MODAL_BG: CSSProperties = {
  background: "var(--dash-modal)",
  border: "1px solid var(--dash-card-border)",
};
