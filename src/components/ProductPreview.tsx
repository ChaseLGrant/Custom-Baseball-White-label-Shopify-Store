// Realistic product mockups rendered in the team's color with their real logo.
// Every product has detailed vector artwork (shading, seams, stitching,
// hardware). If a product lists real photos in the catalog (product.photos),
// the photo is used instead and logos are placed on top of it.
//
// It's a visual guide, not the production proof — final artwork is always
// approved on a proof before anything is made.
import type { ReactNode } from "react";
import type { Product, ProductPhoto } from "@/lib/catalog";

interface Props {
  product: Product;
  colorId: string;
  decorations: { location: string; logoId: string | null }[];
  logoUrls: Record<string, string>;
  names?: boolean;
  numbers?: boolean;
  sampleName?: string;
  sampleNumber?: string;
  className?: string;
  /** Show only the main view (used for small thumbnails). */
  single?: boolean;
}

type Shape = Product["shape"];

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, "0")).join("")}`;
}
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160;
}

/** Colors and paint references for one render. Ids are deterministic so server and client markup match. */
function palette(shape: string, view: string, hex: string) {
  const id = `${shape}-${view}-${hex.slice(1)}`;
  const light = isLight(hex);
  return {
    id,
    base: hex,
    body: `url(#b-${id})`,
    cyl: `url(#c-${id})`,
    shine: `url(#s-${id})`,
    edge: shade(hex, light ? -70 : -45),
    deep: shade(hex, light ? -40 : -28),
    lift: shade(hex, light ? -12 : 30),
    stitch: light ? "rgba(15,23,42,.28)" : "rgba(255,255,255,.35)",
    ink: light ? "#13294b" : "#ffffff",
    trim: light ? "#13294b" : "#f8fafc",
  };
}
type Pal = ReturnType<typeof palette>;

function Defs({ p }: { p: Pal }) {
  return (
    <defs>
      <linearGradient id={`b-${p.id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={shade(p.base, 34)} />
        <stop offset=".5" stopColor={p.base} />
        <stop offset="1" stopColor={shade(p.base, -42)} />
      </linearGradient>
      <linearGradient id={`c-${p.id}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={shade(p.base, -50)} />
        <stop offset=".35" stopColor={shade(p.base, 40)} />
        <stop offset=".55" stopColor={p.base} />
        <stop offset="1" stopColor={shade(p.base, -60)} />
      </linearGradient>
      <radialGradient id={`s-${p.id}`} cx=".32" cy=".22" r=".7">
        <stop offset="0" stopColor="#fff" stopOpacity=".38" />
        <stop offset=".6" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`m-${p.id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f1f5f9" />
        <stop offset=".5" stopColor="#94a3b8" />
        <stop offset="1" stopColor="#e2e8f0" />
      </linearGradient>
      <filter id={`d-${p.id}`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#0f172a" floodOpacity=".22" />
      </filter>
    </defs>
  );
}

const Stitch = ({ d, p }: { d: string; p: Pal }) => <path d={d} fill="none" stroke={p.stitch} strokeWidth="1" strokeDasharray="2.5 2" />;

// ---------------------------------------------------------------------------
// Artwork. Each returns the garment for a view; logos/text are layered after.
// ---------------------------------------------------------------------------

const ART: Record<Shape, (p: Pal, view: "front" | "back") => ReactNode> = {
  jersey: (p, view) => {
    const body = view === "front"
      ? "M60 20 L85 12 Q100 26 115 12 L140 20 L186 46 L170 84 L150 74 L150 206 Q100 212 50 206 L50 74 L30 84 L14 46 Z"
      : "M60 20 L85 14 Q100 20 115 14 L140 20 L186 46 L170 84 L150 74 L150 206 Q100 212 50 206 L50 74 L30 84 L14 46 Z";
    return (
      <>
        <path d={body} fill={p.body} stroke={p.edge} strokeWidth="1.5" strokeLinejoin="round" />
        <path d={body} fill={p.shine} />
        <path d="M14 46 L30 84 M186 46 L170 84" stroke={p.trim} strokeWidth="4" opacity=".9" />
        <path d={view === "front" ? "M85 12 Q100 26 115 12" : "M85 14 Q100 20 115 14"} fill="none" stroke={p.trim} strokeWidth="3.5" />
        {view === "front" && (
          <>
            <path d="M100 25 L100 208" stroke={p.trim} strokeWidth="2.5" opacity=".9" />
            <path d="M104 25 L104 208" stroke={p.edge} strokeWidth="1" opacity=".5" />
            {[48, 82, 116, 150, 184].map((y) => <circle key={y} cx="108" cy={y} r="2.6" fill={p.trim} stroke={p.edge} strokeWidth=".6" />)}
          </>
        )}
        <Stitch d="M53 76 L53 202 M147 76 L147 202" p={p} />
        <path d="M50 74 L50 206" stroke={p.deep} strokeWidth="2" opacity=".5" />
      </>
    );
  },
  tee: (p, view) => {
    const body = "M62 22 Q100 " + (view === "front" ? 42 : 30) + " 138 22 L182 44 L168 82 L148 72 L148 206 Q100 211 52 206 L52 72 L32 82 L18 44 Z";
    return (
      <>
        <path d={body} fill={p.body} stroke={p.edge} strokeWidth="1.5" strokeLinejoin="round" />
        <path d={body} fill={p.shine} />
        <path d={`M62 22 Q100 ${view === "front" ? 42 : 30} 138 22`} fill="none" stroke={p.deep} strokeWidth="5" />
        <Stitch d="M24 58 L38 79 M176 58 L162 79 M54 200 Q100 205 146 200" p={p} />
      </>
    );
  },
  hoodie: (p, view) => {
    const body = "M55 40 L78 30 Q100 52 122 30 L145 40 L186 122 L168 130 L148 92 L148 206 Q100 211 52 206 L52 92 L32 130 L14 122 Z";
    return (
      <>
        {view === "front" ? <path d="M70 42 Q100 0 130 42 Q100 30 70 42" fill={p.deep} stroke={p.edge} strokeWidth="1.5" /> : <path d="M66 46 Q100 -4 134 46 Q100 64 66 46" fill={p.body} stroke={p.edge} strokeWidth="1.5" />}
        <path d={body} fill={p.body} stroke={p.edge} strokeWidth="1.5" strokeLinejoin="round" />
        <path d={body} fill={p.shine} />
        {view === "front" && (
          <>
            <path d="M92 44 L90 84 M108 44 L110 84" stroke={p.trim} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M66 150 L134 150 L144 188 L56 188 Z" fill={p.deep} opacity=".35" stroke={p.edge} strokeWidth="1" />
          </>
        )}
        <path d="M52 196 L148 196" stroke={p.deep} strokeWidth="9" opacity=".55" />
        <path d="M14 122 L32 130 M186 122 L168 130" stroke={p.deep} strokeWidth="7" opacity=".7" />
      </>
    );
  },
  pants: (p) => {
    const body = "M58 14 L142 14 L154 206 L110 206 L100 76 L90 206 L46 206 Z";
    return (
      <>
        <path d={body} fill={p.body} stroke={p.edge} strokeWidth="1.5" strokeLinejoin="round" />
        <path d={body} fill={p.shine} />
        <rect x="58" y="14" width="84" height="12" fill={p.deep} stroke={p.edge} strokeWidth="1" />
        {[66, 88, 112, 134].map((x) => <rect key={x} x={x} y="12" width="4" height="16" rx="1" fill={p.lift} stroke={p.edge} strokeWidth=".6" />)}
        <path d="M51 28 L47 204 M149 28 L153 204" stroke={p.trim} strokeWidth="4" opacity=".85" />
        <path d="M100 26 L100 76" stroke={p.edge} strokeWidth="1" />
        <Stitch d="M66 30 Q76 44 72 60 M134 30 Q124 44 128 60 M54 140 Q70 136 86 140 M114 140 Q130 136 146 140" p={p} />
      </>
    );
  },
  hat: (p, view) =>
    view === "front" ? (
      <>
        <path d="M44 122 Q44 40 100 36 Q156 40 156 122 Z" fill={p.body} stroke={p.edge} strokeWidth="1.5" />
        <path d="M44 122 Q44 40 100 36 Q156 40 156 122 Z" fill={p.shine} />
        <path d="M100 38 L100 120 M72 46 Q66 80 70 122 M128 46 Q134 80 130 122" stroke={p.edge} strokeWidth="1" opacity=".45" fill="none" />
        {[62, 138].map((x) => <circle key={x} cx={x} cy="66" r="2" fill={p.edge} />)}
        <circle cx="100" cy="36" r="5" fill={p.deep} stroke={p.edge} />
        <path d="M26 124 Q100 172 174 124 Q100 140 26 124 Z" fill={p.deep} stroke={p.edge} strokeWidth="1.5" />
        <Stitch d="M34 128 Q100 160 166 128 M40 130 Q100 166 160 130" p={p} />
      </>
    ) : (
      <>
        <path d="M44 132 Q44 48 100 44 Q156 48 156 132 Z" fill={p.body} stroke={p.edge} strokeWidth="1.5" />
        <path d="M44 132 Q44 48 100 44 Q156 48 156 132 Z" fill={p.shine} />
        <path d="M78 132 Q100 106 122 132 Z" fill="#e2e8f0" stroke={p.edge} />
        <path d="M100 46 L100 106" stroke={p.edge} strokeWidth="1" opacity=".45" />
        <circle cx="100" cy="44" r="5" fill={p.deep} stroke={p.edge} />
      </>
    ),
  bag: (p) => (
    <>
      <path d="M48 52 L44 18 L52 16 L58 50 Z M152 52 L156 18 L148 16 L142 50 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
      <ellipse cx="48" cy="17" rx="6" ry="3" fill="#475569" />
      <ellipse cx="152" cy="17" rx="6" ry="3" fill="#475569" />
      <path d="M85 30 Q100 6 115 30" fill="none" stroke={p.edge} strokeWidth="5" strokeLinecap="round" />
      <path d="M52 46 Q52 28 70 28 L130 28 Q148 28 148 46 L150 196 Q150 210 136 210 L64 210 Q50 210 50 196 Z" fill={p.body} stroke={p.edge} strokeWidth="1.5" />
      <path d="M52 46 Q52 28 70 28 L130 28 Q148 28 148 46 L150 196 Q150 210 136 210 L64 210 Q50 210 50 196 Z" fill={p.shine} />
      <path d="M60 66 Q100 54 140 66" fill="none" stroke={p.deep} strokeWidth="2" />
      <path d="M62 150 L138 150 L140 200 L60 200 Z" fill={p.deep} opacity=".45" stroke={p.edge} strokeWidth="1" />
      <Stitch d="M64 154 L136 154 M58 40 Q100 30 142 40" p={p} />
      <rect x="94" y="166" width="12" height="8" rx="2" fill="#94a3b8" />
    </>
  ),
  helmet: (p, view) =>
    view === "front" ? (
      <>
        <path d="M30 120 C28 66 70 34 116 34 C158 34 186 62 188 104 L188 116 C188 122 184 124 178 124 L150 124 C146 124 144 128 144 132 L144 168 C144 182 132 192 116 192 L100 192 C86 192 76 184 74 170 L70 148 C50 148 32 140 30 126 Z" fill={p.body} stroke={p.edge} strokeWidth="1.5" />
        <path d="M30 120 C28 66 70 34 116 34 C158 34 186 62 188 104 L188 116 C188 122 184 124 178 124 L150 124 C146 124 144 128 144 132 L144 168 C144 182 132 192 116 192 L100 192 C86 192 76 184 74 170 L70 148 C50 148 32 140 30 126 Z" fill={p.shine} />
        <path d="M176 112 Q199 114 198 126 Q186 134 150 128 L150 124 L178 124 Z" fill={p.deep} stroke={p.edge} strokeWidth="1.2" />
        <path d="M48 70 Q90 38 150 52" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="112" cy="156" rx="11" ry="14" fill="#0f172a" opacity=".85" />
        {[0, 1, 2].map((i) => <circle key={i} cx={106 + i * 6} cy="154" r="1.6" fill={p.edge} />)}
        {[[60, 64], [52, 84], [148, 48]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="5" ry="2.5" fill="#0f172a" opacity=".55" transform={`rotate(-28 ${x} ${y})`} />)}
        <path d="M70 148 C52 148 36 142 30 126" fill="none" stroke="#1e293b" strokeWidth="4" opacity=".5" />
      </>
    ) : (
      <>
        <path d="M40 150 C34 92 64 46 100 46 C136 46 166 92 160 150 C160 166 140 172 132 160 L126 146 L74 146 L68 160 C60 172 40 166 40 150 Z" fill={p.body} stroke={p.edge} strokeWidth="1.5" />
        <path d="M40 150 C34 92 64 46 100 46 C136 46 166 92 160 150 C160 166 140 172 132 160 L126 146 L74 146 L68 160 C60 172 40 166 40 150 Z" fill={p.shine} />
        <path d="M74 146 L126 146 L120 158 L80 158 Z" fill="#0f172a" opacity=".8" />
        <path d="M62 70 Q100 50 138 70" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="4" strokeLinecap="round" />
      </>
    ),
  decal: (p) => (
    <>
      <rect x="14" y="26" width="172" height="170" rx="10" fill="#ffffff" stroke="#cbd5e1" />
      <rect x="20" y="36" width="78" height="78" rx="12" fill="none" stroke="#94a3b8" strokeDasharray="4 3" />
      <rect x="104" y="36" width="48" height="48" rx="10" fill="none" stroke="#94a3b8" strokeDasharray="4 3" />
      <rect x="104" y="96" width="72" height="86" rx="10" fill="none" stroke="#94a3b8" strokeDasharray="4 3" />
      <rect x="20" y="124" width="78" height="58" rx="10" fill={p.base} opacity=".12" />
      <text x="59" y="160" textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748b" fontFamily="Inter, Arial, sans-serif">HELMET KIT</text>
    </>
  ),
  pinetar: (p) => (
    <>
      <ellipse cx="100" cy="204" rx="34" ry="6" fill="#0f172a" opacity=".15" />
      <rect x="68" y="66" width="64" height="136" rx="10" fill={p.cyl} stroke={p.edge} strokeWidth="1.2" />
      <rect x="64" y="22" width="72" height="48" rx="10" fill={`url(#m-${p.id})`} stroke="#64748b" strokeWidth="1.2" />
      {[30, 38, 46, 54, 62].map((y) => <path key={y} d={`M66 ${y} L134 ${y}`} stroke="#64748b" strokeOpacity=".35" />)}
      <rect x="74" y="98" width="52" height="84" rx="4" fill="#ffffff" stroke={p.edge} strokeOpacity=".4" />
      <rect x="74" y="98" width="52" height="8" fill={p.base} />
      <text x="100" y="168" textAnchor="middle" fontSize="8.5" fontWeight="800" letterSpacing="1" fill="#0f172a" fontFamily="Inter, Arial, sans-serif">PINE TAR</text>
      <text x="100" y="177" textAnchor="middle" fontSize="5.5" fill="#64748b" fontFamily="Inter, Arial, sans-serif">GAME GRADE · 2.5 OZ</text>
    </>
  ),
  grip: (p) => (
    <>
      <ellipse cx="100" cy="206" rx="40" ry="6" fill="#0f172a" opacity=".12" />
      <path d="M62 4 L138 4 L118 64 L82 64 Z" fill={`url(#m-${p.id})`} stroke="#64748b" />
      <path d="M70 4 L84 64" stroke="#fff" strokeOpacity=".5" strokeWidth="3" />
      <rect x="80" y="60" width="40" height="134" rx="8" fill={p.cyl} stroke={p.edge} strokeWidth="1.2" />
      {Array.from({ length: 13 }, (_, i) => 64 + i * 10).map((y) => <path key={y} d={`M80 ${y + 8} L120 ${y}`} stroke="#fff" strokeOpacity=".2" strokeWidth="1.6" />)}
      <ellipse cx="100" cy="196" rx="30" ry="11" fill={p.deep} stroke={p.edge} strokeWidth="1.2" />
      <ellipse cx="100" cy="193" rx="22" ry="6" fill={p.lift} opacity=".5" />
    </>
  ),
  belt: (p) => (
    <>
      <path d="M30 86 Q104 66 176 86 L176 132 Q104 112 30 132 Z" fill={p.body} stroke={p.edge} strokeWidth="1.2" />
      <path d="M30 86 Q104 66 176 86 L176 132 Q104 112 30 132 Z" fill={p.shine} />
      {[96, 104, 112, 120].map((y) => <path key={y} d={`M38 ${y} Q104 ${y - 19} 170 ${y}`} fill="none" stroke={p.stitch} strokeWidth=".8" />)}
      <path d="M160 82 Q178 84 190 90 L198 110 L190 130 Q178 128 160 128 Z" fill="#6b4430" stroke="#3b2418" />
      <Stitch d="M164 87 Q178 89 188 94 M164 123 Q178 125 188 126" p={{ ...p, stitch: "rgba(255,255,255,.5)" }} />
      <rect x="8" y="74" width="36" height="70" rx="9" fill={`url(#m-${p.id})`} stroke="#475569" strokeWidth="1.2" />
      <rect x="16" y="84" width="20" height="50" rx="5" fill="#f8fafc" stroke="#94a3b8" />
      <rect x="22" y="80" width="8" height="58" rx="4" fill={`url(#m-${p.id})`} stroke="#475569" strokeWidth=".8" />
    </>
  ),
  mitt: (p) => (
    <>
      <path d="M58 198 L58 122 C40 124 34 104 48 96 C56 92 60 98 62 104 C62 66 74 34 100 34 C126 34 140 66 140 112 L142 198 Z" fill={p.body} stroke={p.edge} strokeWidth="1.5" />
      <path d="M58 198 L58 122 C40 124 34 104 48 96 C56 92 60 98 62 104 C62 66 74 34 100 34 C126 34 140 66 140 112 L142 198 Z" fill={p.shine} />
      {[52, 64, 76, 88].map((y) => <path key={y} d={`M68 ${y + 4} Q100 ${y - 8} 132 ${y + 4}`} fill="none" stroke={p.deep} strokeWidth="3" opacity=".7" />)}
      <rect x="56" y="164" width="88" height="30" rx="5" fill={p.deep} stroke={p.edge} />
      <rect x="62" y="170" width="76" height="18" rx="3" fill="#0f172a" opacity=".25" />
      <Stitch d="M66 112 L66 160 M134 112 L134 160" p={p} />
    </>
  ),
  glove: (p) => (
    <>
      <path d="M66 130 C50 122 34 104 38 92 C42 82 54 88 62 100 L72 116 Z" fill={p.body} stroke={p.edge} strokeWidth="1.2" />
      {[
        [72, 44, 18],
        [92, 34, 18],
        [112, 40, 18],
        [131, 58, 15],
      ].map(([x, y, w]) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={130 - y} rx={w / 2} fill={p.body} stroke={p.edge} strokeWidth="1.2" />
          <rect x={x} y={y} width={w} height="16" rx={w / 2} fill="#f8fafc" opacity=".9" stroke={p.edge} strokeWidth=".8" />
          <Stitch d={`M${x + w / 2} ${y + 18} L${x + w / 2} 116`} p={p} />
        </g>
      ))}
      <path d="M66 108 L148 108 L148 172 Q106 178 66 172 Z" fill={p.body} stroke={p.edge} strokeWidth="1.2" />
      <path d="M66 108 L148 108 L148 172 Q106 178 66 172 Z" fill={p.shine} />
      <path d="M70 112 Q107 102 146 112" fill="none" stroke={p.deep} strokeWidth="3" opacity=".6" />
      <rect x="64" y="168" width="88" height="30" rx="6" fill="#0f172a" stroke="#020617" />
      <rect x="70" y="173" width="18" height="20" rx="3" fill={p.base} opacity=".8" />
    </>
  ),
  tape: (p) => (
    <>
      <path d="M100 58 L196 44 L196 94 L108 106 Z" fill={p.base} stroke={p.edge} strokeWidth="1" />
      <path d="M196 44 L190 52 L196 60 L190 68 L196 76 L190 84 L196 94" fill="none" stroke={p.edge} strokeWidth="1" />
      <ellipse cx="80" cy="118" rx="62" ry="64" fill={p.deep} />
      <ellipse cx="74" cy="114" rx="62" ry="64" fill={p.body} stroke={p.edge} strokeWidth="1.2" />
      {[50, 42, 34].map((r) => <ellipse key={r} cx="74" cy="114" rx={r} ry={r + 1} fill="none" stroke={p.edge} strokeOpacity=".18" />)}
      <ellipse cx="74" cy="114" rx="24" ry="25" fill="#d6b98c" stroke="#a8875a" strokeWidth="2" />
      <ellipse cx="74" cy="114" rx="17" ry="18" fill="#f8fafc" />
    </>
  ),
  eyeblack: (p) => (
    <>
      <rect x="18" y="58" width="164" height="108" rx="12" fill="#ffffff" stroke="#cbd5e1" />
      <text x="100" y="80" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="2" fill="#94a3b8" fontFamily="Inter, Arial, sans-serif">GAME DAY</text>
      <path d="M32 98 Q60 88 92 96 L90 124 Q60 118 34 126 Z" fill="#0b0b0f" />
      <path d="M168 98 Q140 88 108 96 L110 124 Q140 118 166 126 Z" fill="#0b0b0f" />
      <path d="M36 100 Q60 92 88 98" fill="none" stroke="#fff" strokeOpacity=".15" strokeWidth="2" />
      <text x="100" y="152" textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="Inter, Arial, sans-serif">1 OF 12 PAIRS</text>
    </>
  ),
  sleeve: (p) => (
    <>
      <path d="M68 18 L132 18 L124 202 L80 202 Z" fill={p.body} stroke={p.edge} strokeWidth="1.5" />
      <path d="M68 18 L132 18 L124 202 L80 202 Z" fill={p.shine} />
      <rect x="67" y="16" width="66" height="12" rx="3" fill={p.deep} />
      <path d="M73 150 L127 150 M74 158 L126 158" stroke={p.trim} strokeWidth="3" opacity=".8" />
      <Stitch d="M100 30 L100 200" p={p} />
    </>
  ),
  socks: (p) => (
    <>
      <path d="M70 12 L122 12 L122 150 C122 160 128 166 138 168 L176 172 C192 174 194 198 176 202 L96 202 C78 202 70 190 70 172 Z" fill={p.body} stroke={p.edge} strokeWidth="1.5" />
      <path d="M70 12 L122 12 L122 150 C122 160 128 166 138 168 L176 172 C192 174 194 198 176 202 L96 202 C78 202 70 190 70 172 Z" fill={p.shine} />
      <rect x="70" y="12" width="52" height="16" fill={p.deep} />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${76 + i * 10} 13 L${76 + i * 10} 27`} stroke={p.edge} strokeOpacity=".4" />)}
      <path d="M70 108 L122 108 M70 118 L122 118" stroke={p.trim} strokeWidth="5" />
      <path d="M70 172 C70 190 78 202 96 202 L106 202 C96 190 92 178 96 166 C86 164 76 166 70 172 Z" fill={p.deep} opacity=".7" />
      <path d="M176 172 C192 174 194 198 176 202 L164 202 C170 192 170 180 164 171 Z" fill={p.deep} opacity=".7" />
    </>
  ),
};

/** Which shapes have a second (back) view, and what the views are called. */
const VIEWS: Partial<Record<Shape, [string, string]>> = {
  jersey: ["Front", "Back"],
  tee: ["Front", "Back"],
  hoodie: ["Front", "Back"],
  hat: ["Front", "Back"],
  helmet: ["Side", "Back"],
};

/** Extra copies of a location's logo (repeating prints). */
const COPIES: Partial<Record<Shape, { x: number; y: number; w: number; h: number }[]>> = {
  tape: [{ x: 166, y: 52, w: 24, h: 24 }, { x: 48, y: 52, w: 20, h: 20 }],
  eyeblack: [{ x: 128, y: 96, w: 30, h: 26 }],
  decal: [{ x: 110, y: 42, w: 36, h: 36 }],
  grip: [{ x: 86, y: 134, w: 28, h: 28 }],
};

/** Where numbers go for each shape (and which view). */
const NUMBER_SPOT: Partial<Record<Shape, { view: "front" | "back"; x: number; y: number; size: number; color?: "ink" | "base" | "white" }>> = {
  jersey: { view: "back", x: 100, y: 150, size: 58 },
  tee: { view: "back", x: 100, y: 150, size: 54 },
  hoodie: { view: "back", x: 100, y: 156, size: 50 },
  helmet: { view: "back", x: 100, y: 130, size: 38 },
  decal: { view: "front", x: 140, y: 156, size: 44, color: "base" },
  glove: { view: "front", x: 120, y: 189, size: 14, color: "white" },
  mitt: { view: "front", x: 100, y: 184, size: 15 },
  sleeve: { view: "front", x: 100, y: 128, size: 34 },
  eyeblack: { view: "front", x: 138, y: 117, size: 18, color: "base" },
  grip: { view: "front", x: 100, y: 186, size: 10, color: "white" },
};

export function ProductPreview({ product, colorId, decorations, logoUrls, names, numbers, sampleName = "PLAYER", sampleNumber = "12", className, single }: Props) {
  const hex = product.colors.find((c) => c.id === colorId)?.hex ?? "#d1d5db";
  const shape = product.shape;
  if (product.photo) {
    return (
      <PhotoPreview product={product} colorId={colorId} hex={hex} decorations={decorations} logoUrls={logoUrls} numbers={numbers} sampleNumber={sampleNumber} className={className} />
    );
  }
  const twoViews = !single && VIEWS[shape] && (product.locations.some((l) => l.view === "back") || ((names || numbers) && NUMBER_SPOT[shape]?.view === "back"));
  const views: ("front" | "back")[] = twoViews ? ["front", "back"] : ["front"];

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      {views.map((view) => {
        const p = palette(shape, view, hex);
        const numberSpot = NUMBER_SPOT[shape];
        const textColor = (c?: "ink" | "base" | "white") => (c === "base" ? (isLight(hex) ? shade(hex, -60) : hex) : c === "white" ? "#fff" : p.ink);
        return (
          <figure key={view} className="flex-1">
            <svg viewBox="0 0 200 220" className="w-full" role="img" aria-label={`${product.name} ${view} view`}>
              <Defs p={p} />
              <g filter={`url(#d-${p.id})`}>
                {ART[shape](p, view)}
              </g>

              {/* Logos at their real placements (plus repeat copies for repeating prints). */}
              {product.locations
                .filter((l) => l.view === view)
                .map((loc) => {
                  const d = decorations.find((x) => x.location === loc.id);
                  if (!d) return null;
                  const url = d.logoId ? logoUrls[d.logoId] : null;
                  const boxes = [loc.box, ...(COPIES[shape] ?? [])].filter((_, i) => !(i === 1 && shape === "eyeblack" && numbers));
                  return boxes.map((b, i) =>
                    url ? (
                      <image key={`${loc.id}${i}`} href={url} x={b.x} y={b.y} width={b.w} height={b.h} preserveAspectRatio="xMidYMid meet" opacity={i ? 0.9 : 1} />
                    ) : (
                      <rect key={`${loc.id}${i}`} x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill="none" stroke={p.ink} strokeDasharray="4 3" opacity=".6" />
                    ),
                  );
                })}

              {/* Names & numbers */}
              {view === "back" && names && VIEWS[shape] && shape !== "helmet" && (
                <text x="100" y={shape === "hoodie" ? 82 : 74} textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="2" fill={p.ink} fontFamily="'Barlow Condensed', Arial Black, sans-serif">
                  {sampleName.toUpperCase().slice(0, 14)}
                </text>
              )}
              {numbers && numberSpot && numberSpot.view === view && (
                <text
                  x={numberSpot.x}
                  y={numberSpot.y}
                  textAnchor="middle"
                  fontSize={numberSpot.size}
                  fontWeight="900"
                  fill={textColor(numberSpot.color)}
                  stroke={numberSpot.size > 30 ? p.edge : "none"}
                  strokeWidth="1"
                  fontFamily="'Barlow Condensed', Arial Black, sans-serif"
                >
                  {sampleNumber}
                </text>
              )}
            </svg>
            {views.length > 1 && <figcaption className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">{VIEWS[shape]![view === "front" ? 0 : 1]}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Real product photos
// ---------------------------------------------------------------------------

/**
 * Re-tints a product photo to another team color. The dyed material's shading
 * (lo..hi) is stretched to 0..1, multiplied by the target color, and the
 * pixels that aren't the dyed material (white labels, metal buckles, glossy
 * reflections, dark piping on light pants) are laid back on top untouched.
 */
function TintFilter({ id, photo, hex }: { id: string; photo: ProductPhoto; hex: string }) {
  const n = parseInt(hex.slice(1), 16);
  const targetLum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  const range = Math.max(photo.hi - photo.lo, 0.02);
  const slope = 1 / range;
  const intercept = -photo.lo / range;
  // Darkest shade relative to the flat color: lighter colors need a higher floor to still read as that color.
  const floor = targetLum > 0.75 ? 0.66 : targetLum > 0.45 ? 0.5 : 0.36;
  // Mask of pixels to keep from the original photo.
  const ramp = 12;
  const lumRow = (k: number, offset: number) => `${(k * 0.2126).toFixed(4)} ${(k * 0.7152).toFixed(4)} ${(k * 0.0722).toFixed(4)} 0 ${offset.toFixed(4)}`;
  const keepRow =
    photo.material === "dark"
      ? lumRow(ramp, -ramp * (photo.hi + 0.06)) // keep what's brighter than the dyed range
      : lumRow(-ramp, ramp * (photo.lo - 0.06)); // keep what's darker than the dyed range
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values={`${lumRow(1, 0)} ${lumRow(1, 0)} ${lumRow(1, 0)} 0 0 0 1 0`} result="lum" />
      <feComponentTransfer in="lum" result="norm">
        <feFuncR type="linear" slope={slope} intercept={intercept} />
        <feFuncG type="linear" slope={slope} intercept={intercept} />
        <feFuncB type="linear" slope={slope} intercept={intercept} />
      </feComponentTransfer>
      <feComponentTransfer in="norm" result="shade">
        <feFuncR type="gamma" amplitude={1 - floor} exponent="0.9" offset={floor} />
        <feFuncG type="gamma" amplitude={1 - floor} exponent="0.9" offset={floor} />
        <feFuncB type="gamma" amplitude={1 - floor} exponent="0.9" offset={floor} />
      </feComponentTransfer>
      <feFlood floodColor={hex} result="tint" />
      <feBlend in="shade" in2="tint" mode="multiply" result="colored" />
      <feComponentTransfer in="norm" result="sheen">
        <feFuncR type="gamma" amplitude="0.22" exponent="5" offset="0" />
        <feFuncG type="gamma" amplitude="0.22" exponent="5" offset="0" />
        <feFuncB type="gamma" amplitude="0.22" exponent="5" offset="0" />
      </feComponentTransfer>
      <feBlend in="sheen" in2="colored" mode="screen" result="lit" />
      <feComposite in="lit" in2="SourceAlpha" operator="in" result="litA" />
      <feColorMatrix in="SourceGraphic" type="matrix" values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 ${keepRow}`} result="keepRaw" />
      <feComposite in="keepRaw" in2="SourceAlpha" operator="in" result="keep" />
      <feMerge>
        <feMergeNode in="litA" />
        <feMergeNode in="keep" />
      </feMerge>
    </filter>
  );
}

function PhotoPreview({ product, colorId, hex, decorations, logoUrls, numbers, sampleNumber, className }: {
  product: Product;
  colorId: string;
  hex: string;
  decorations: { location: string; logoId: string | null }[];
  logoUrls: Record<string, string>;
  numbers?: boolean;
  sampleNumber: string;
  className?: string;
}) {
  const photo = product.photo!;
  const tint = photo.recolor && colorId !== photo.color;
  const filterId = `ph-${product.id}-${colorId}`;
  const ink = isLight(hex) ? "#13294b" : "#ffffff";
  const numberColor = photo.recolor ? ink : isLight(hex) ? shade(hex, -60) : hex;
  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <figure className="flex-1">
        <svg viewBox="0 0 200 220" className="w-full" role="img" aria-label={product.name}>
          {tint && (
            <defs>
              <TintFilter id={filterId} photo={photo} hex={hex} />
            </defs>
          )}
          <image href={photo.src} x="0" y="0" width="200" height="220" preserveAspectRatio="xMidYMid meet" filter={tint ? `url(#${filterId})` : undefined} />
          {product.locations.map((loc) => {
            const box = photo.boxes[loc.id];
            const d = decorations.find((x) => x.location === loc.id);
            if (!box || !d) return null;
            const url = d.logoId ? logoUrls[d.logoId] : null;
            // On eye black, a player number replaces the second strip's logo.
            const copies = numbers && product.shape === "eyeblack" ? [] : photo.copies?.[loc.id] ?? [];
            return [box, ...copies].map((b, i) =>
              url ? (
                <image key={`${loc.id}${i}`} href={url} x={b.x} y={b.y} width={b.w} height={b.h} preserveAspectRatio="xMidYMid meet" />
              ) : (
                <rect key={`${loc.id}${i}`} x={b.x} y={b.y} width={b.w} height={b.h} rx="4" fill="none" stroke={ink} strokeDasharray="4 3" opacity=".6" />
              ),
            );
          })}
          {numbers && photo.number && (
            <text x={photo.number.x} y={photo.number.y} textAnchor="middle" fontSize={photo.number.size} fontWeight="900" fill={numberColor} fontFamily="'Barlow Condensed', Arial Black, sans-serif">
              {sampleNumber}
            </text>
          )}
        </svg>
      </figure>
    </div>
  );
}
