// Size lists and a typical fit chart shared by the order page and the
// public size-collection page.

export const APPAREL_SIZES = ["YS", "YM", "YL", "YXL", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export const HAT_SIZES = ["XS/S", "S/M", "M/L", "L/XL"] as const;

/** Typical chest measurements (inches) for team apparel. */
export const APPAREL_FIT: [string, string][] = [
  ["YS", "26–28"], ["YM", "28–30"], ["YL", "30–32"], ["YXL", "32–34"],
  ["S", "34–36"], ["M", "38–40"], ["L", "42–44"], ["XL", "46–48"], ["2XL", "50–52"], ["3XL", "54–56"],
];

/** Typical fitted-cap sizes by head circumference. */
export const HAT_FIT: [string, string, string][] = [
  ["XS/S", "6½–6⅞", "20½–21⅝"],
  ["S/M", "6⅞–7¼", "21⅝–22¾"],
  ["M/L", "7⅛–7½", "22⅜–23½"],
  ["L/XL", "7⅜–7¾", "23⅛–24⅜"],
];
