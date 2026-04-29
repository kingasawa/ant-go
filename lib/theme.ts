/**
 * ACCENT COLOR — chỉ cần đổi 3 dòng này để retheme toàn bộ site.
 * Format: "R G B" (space-separated, không có dấu phẩy)
 */
export const ACCENT     = "240 195 142"; // #F0C38E — main
export const ACCENT_LT  = "245 214 178"; // lighter — hover, muted text
export const ACCENT_DK  = "215 165 100"; // darker  — shadows, deep bg
export const ACCENT_CT  = "120  53  15"; // #78350F — dark amber for text on accent bg

/** Helper dùng trong inline JSX style */
export const ac  = (o: number) => `rgb(${ACCENT} / ${o})`;
export const acl = (o: number) => `rgb(${ACCENT_LT} / ${o})`;
export const acd = (o: number) => `rgb(${ACCENT_DK} / ${o})`;
export const acc = (o: number) => `rgb(${ACCENT_CT} / ${o})`;
