// Live SVG mockup of a product in the chosen color with logos at their real
// placements. It's a visual guide, not the production proof — final artwork is
// always approved on a proof before production.
import type { Product } from "@/lib/catalog";

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
}

const SHAPES: Record<Product["shape"], { front: string; back: string; details?: (stroke: string) => React.ReactNode }> = {
  jersey: {
    front: "M60 20 L85 12 Q100 24 115 12 L140 20 L186 46 L170 82 L150 72 L150 206 L50 206 L50 72 L30 82 L14 46 Z",
    back: "M60 20 L85 14 Q100 18 115 14 L140 20 L186 46 L170 82 L150 72 L150 206 L50 206 L50 72 L30 82 L14 46 Z",
  },
  tee: {
    front: "M62 22 Q100 42 138 22 L182 44 L168 82 L148 72 L148 206 L52 206 L52 72 L32 82 L18 44 Z",
    back: "M62 22 Q100 30 138 22 L182 44 L168 82 L148 72 L148 206 L52 206 L52 72 L32 82 L18 44 Z",
  },
  hoodie: {
    front: "M55 40 L78 30 Q100 52 122 30 L145 40 L186 122 L168 130 L148 92 L148 206 L52 206 L52 92 L32 130 L14 122 Z",
    back: "M55 40 L78 30 Q100 36 122 30 L145 40 L186 122 L168 130 L148 92 L148 206 L52 206 L52 92 L32 130 L14 122 Z",
  },
  pants: {
    front: "M58 14 L142 14 L152 206 L110 206 L100 74 L90 206 L48 206 Z",
    back: "M58 14 L142 14 L152 206 L110 206 L100 74 L90 206 L48 206 Z",
  },
  hat: {
    front: "M44 122 Q44 40 100 36 Q156 40 156 122 Z",
    back: "M44 130 Q44 48 100 44 Q156 48 156 130 Z",
  },
  bag: {
    front: "M55 42 Q55 26 70 26 L130 26 Q145 26 145 42 L148 198 Q148 210 136 210 L64 210 Q52 210 52 198 Z",
    back: "M55 42 Q55 26 70 26 L130 26 Q145 26 145 42 L148 198 Q148 210 136 210 L64 210 Q52 210 52 198 Z",
  },
};

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, "0")).join("")}`;
}
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160;
}

export function ProductPreview({ product, colorId, decorations, logoUrls, names, numbers, sampleName = "PLAYER", sampleNumber = "12", className }: Props) {
  const color = product.colors.find((c) => c.id === colorId)?.hex ?? "#d1d5db";
  const stroke = shade(color, isLight(color) ? -70 : -40);
  const ink = isLight(color) ? "#13294b" : "#ffffff";
  const shape = SHAPES[product.shape];
  const showBack = product.locations.some((l) => l.view === "back") || names || numbers;
  const views: ("front" | "back")[] = showBack ? ["front", "back"] : ["front"];

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      {views.map((view) => (
        <figure key={view} className="flex-1">
          <svg viewBox="0 0 200 220" className="w-full" role="img" aria-label={`${product.name} ${view} view`}>
            {product.shape === "hoodie" && view === "front" && <path d="M72 40 Q100 4 128 40" fill={shade(color, -20)} stroke={stroke} strokeWidth="2" />}
            <path d={shape[view]} fill={color} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
            {/* Garment details */}
            {product.shape === "jersey" && view === "front" && (
              <>
                <line x1="100" y1="24" x2="100" y2="206" stroke={stroke} strokeWidth="1.5" />
                {[50, 85, 120, 155, 190].map((y) => <circle key={y} cx="104" cy={y} r="2" fill={stroke} />)}
              </>
            )}
            {product.shape === "pants" && (
              <>
                <rect x="58" y="14" width="84" height="10" fill={shade(color, -18)} stroke={stroke} strokeWidth="1" />
                <line x1="52" y1="26" x2="49" y2="204" stroke={ink} strokeWidth="3" opacity="0.6" />
                <line x1="148" y1="26" x2="151" y2="204" stroke={ink} strokeWidth="3" opacity="0.6" />
              </>
            )}
            {product.shape === "hat" && view === "front" && (
              <>
                <path d="M28 124 Q100 168 172 124 Q100 142 28 124 Z" fill={shade(color, -25)} stroke={stroke} strokeWidth="2" />
                <circle cx="100" cy="37" r="4" fill={shade(color, -25)} />
                <path d="M100 38 L100 120" stroke={stroke} strokeWidth="1" opacity="0.5" />
              </>
            )}
            {product.shape === "hat" && view === "back" && (
              <path d="M80 130 Q100 108 120 130 Z" fill="#f8fafc" stroke={stroke} strokeWidth="1.5" />
            )}
            {product.shape === "hoodie" && view === "front" && (
              <path d="M70 150 L130 150 L140 186 L60 186 Z" fill="none" stroke={stroke} strokeWidth="1.5" />
            )}
            {product.shape === "bag" && <path d="M85 26 Q100 6 115 26" fill="none" stroke={stroke} strokeWidth="4" />}

            {/* Logos */}
            {product.locations
              .filter((l) => l.view === view)
              .map((loc) => {
                const d = decorations.find((x) => x.location === loc.id);
                if (!d) return null;
                const url = d.logoId ? logoUrls[d.logoId] : null;
                return url ? (
                  <image key={loc.id} href={url} x={loc.box.x} y={loc.box.y} width={loc.box.w} height={loc.box.h} preserveAspectRatio="xMidYMid meet" />
                ) : (
                  <rect key={loc.id} x={loc.box.x} y={loc.box.y} width={loc.box.w} height={loc.box.h} fill="none" stroke={ink} strokeDasharray="4 3" opacity="0.7" />
                );
              })}

            {/* Personalization on the back */}
            {view === "back" && names && (
              <text x="100" y={product.shape === "hat" ? 80 : 74} textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="2" fill={ink} fontFamily="Arial Black, Arial, sans-serif">
                {sampleName.toUpperCase().slice(0, 14)}
              </text>
            )}
            {view === "back" && numbers && (
              <text x="100" y="150" textAnchor="middle" fontSize="58" fontWeight="900" fill={ink} stroke={stroke} strokeWidth="1" fontFamily="Arial Black, Arial, sans-serif">
                {sampleNumber}
              </text>
            )}
          </svg>
          <figcaption className="text-center text-xs uppercase tracking-wide text-slate-400">{view}</figcaption>
        </figure>
      ))}
    </div>
  );
}
