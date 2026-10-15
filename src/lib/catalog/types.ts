// Types describing the product catalog and supplier pricing rules.

export type Category =
  | "JERSEY" | "PANTS" | "HAT" | "SHIRT" | "OUTERWEAR" | "ACCESSORY"
  | "HELMET" | "GLOVES" | "BELT" | "SOCKS" | "BAT" | "GAMEDAY";

/** Top-level shopping groups used for navigation. */
export type Group = "uniforms" | "headwear" | "gear" | "gameday" | "apparel";

/**
 * Which roster size column a product reads from. "mapped" converts the
 * player's apparel size with the product's sizeMap (e.g. L -> "Adult" mitt).
 */
export type SizeField = "topSize" | "bottomSize" | "hatSize" | "mapped" | "none";

export type DecorationMethodId = "EMBROIDERY" | "SCREEN_PRINT" | "HEAT_TRANSFER" | "TACKLE_TWILL" | "FULL_COLOR_PRINT" | "VINYL_DECAL" | "INCLUDED";

export interface PriceTier {
  /** Tier applies when the order's total quantity of this product/method is >= minQty. */
  minQty: number;
  unitCents: number;
}

export interface DecorationMethod {
  id: DecorationMethodId;
  label: string;
  description: string;
  /** Per-piece, per-location price tiers. */
  tiers: PriceTier[];
  /** Setup charged once per logo per order (screens, digitizing). */
  setupCents: number;
  /** When true, setup is charged only the first time a logo is ever produced with this method. */
  setupOneTimePerLogo: boolean;
  /** Minimum pieces carrying this decoration in one order. */
  minQty: number;
}

export interface DecorationLocation {
  id: string;
  label: string;
  view: "front" | "back";
  methods: DecorationMethodId[];
  /** Rectangle in the 200x220 preview canvas where artwork is drawn. */
  box: { x: number; y: number; w: number; h: number };
  maxSizeIn: string;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: Category;
  group: Group;
  shape:
    | "jersey" | "pants" | "hat" | "tee" | "hoodie" | "bag"
    | "helmet" | "decal" | "pinetar" | "grip" | "belt" | "mitt" | "glove" | "tape" | "eyeblack" | "sleeve" | "socks";
  /** Short selling line shown on cards. */
  tagline: string;
  /**
   * "player": one per player by default (from the roster).
   * "team": a team supply ordered by quantity (pine tar, wrist tape).
   */
  orderUnit: "player" | "team";
  /** What one unit is, e.g. "pair", "roll", "stick". */
  unitLabel?: string;
  /** Starting quantity for team-supply items. */
  defaultTeamQty?: number;
  /** For sizeField "mapped": apparel size -> product size. */
  sizeMap?: Record<string, string>;
  /** Optional real product photo; replaces the illustrated mockup. */
  photo?: ProductPhoto;
  description: string;
  features: string[];
  sports: string[];
  supplier: string;
  colors: ColorOption[];
  sizes: string[];
  sizeField: SizeField;
  /** Upcharge per piece for larger sizes. */
  sizeUpcharges: Record<string, number>;
  minQty: number;
  /** Production time after proof approval, in business days. */
  leadTimeDays: [number, number];
  pricing: {
    /**
     * VERIFIED: price tiers confirmed against the supplier's current price list;
     *   orders can be paid online immediately.
     * QUOTE_REQUIRED: we can't price this automatically (custom manufacturing,
     *   no supplier price list). Orders go to pricing review first.
     */
    status: "VERIFIED" | "QUOTE_REQUIRED";
    tiers: PriceTier[];
    /** Above this total quantity the supplier must confirm capacity/price. */
    maxAutoQty: number;
    /** Where the price came from and when it was verified (for audit). */
    source: string;
    verifiedAt: string | null;
  };
  locations: DecorationLocation[];
  personalization: {
    names?: { unitCents: number; label: string };
    numbers?: { unitCents: number; label: string };
  };
}

export interface ShippingRule {
  flatCents: number;
  freeOverCents: number;
  description: string;
}

export interface Catalog {
  version: string;
  /** true while the catalog contains placeholder prices, not real supplier prices. */
  isSample: boolean;
  products: Product[];
  decorationMethods: Record<DecorationMethodId, DecorationMethod>;
  shipping: ShippingRule;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  /** "fill" squeezes the logo into the box, e.g. to follow a curved surface seen at an angle. */
  fit?: "contain" | "fill";
}

/**
 * A real product photo, prepared by scripts/photos/process.py (transparent
 * background, centered in a 200x220 frame). One photo covers every color:
 * the dyed material is re-tinted in the browser, while labels, buckles and
 * glossy highlights keep their original look.
 */
export interface ProductPhoto {
  src: string;
  /** Color id the photo was shot in; shown untouched. */
  color: string;
  /** false: show the same photo for every color (e.g. eye black, decal sheet). */
  recolor: boolean;
  /** Which part is the dyed material: the dark part (black items) or the light part (gray pants). */
  material: "dark" | "light";
  /** Shading range of the dyed material (from photo-meta.json). */
  lo: number;
  hi: number;
  /** Logo placement per location id on this photo. Locations without a box aren't shown on the photo. */
  boxes: Record<string, Box>;
  /** Extra copies of a location's logo (repeating prints). */
  copies?: Record<string, Box[]>;
  /** Where a player number is printed on the photo, if anywhere. */
  number?: { x: number; y: number; size: number };
  /** SVG path (200x220 frame) of an area that keeps its original color, e.g. a helmet's black padding. */
  keepClip?: string;
}
