// A generic team logo used to show off mockups on marketing pages.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
<path d="M100 6 L186 34 L178 120 Q166 170 100 196 Q34 170 22 120 L14 34 Z" fill="#e9e9e9" stroke="#0a0b0d" stroke-width="9" stroke-linejoin="round"/>
<path d="M100 26 L168 48 L162 116 Q152 156 100 176 Q48 156 38 116 L32 48 Z" fill="#0a0b0d"/>
<text x="100" y="128" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="70" font-weight="900" fill="#ffffff" font-style="italic">CC</text>
</svg>`;
export const SAMPLE_LOGO_URL = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
export const SAMPLE_LOGO = { id: "sample", url: SAMPLE_LOGO_URL };
