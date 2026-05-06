import type { CSSProperties } from "react";

// Flat dark card — dùng cho card thông thường trên nền tối
export const GLASS: CSSProperties = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
};

// Modal / drawer — cần background solid để đọc được nội dung khi float trên overlay
export const MODAL_BG: CSSProperties = {
  background: "#13152E",
  border: "1px solid rgba(255, 255, 255, 0.1)",
};
