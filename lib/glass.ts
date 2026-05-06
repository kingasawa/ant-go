import type { CSSProperties } from "react";

// Flat dark card — không còn glass effect (backdrop-filter / box-shadow)
export const GLASS: CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
};
