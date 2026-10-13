// Types describing the product catalog and supplier pricing rules.

export type Category = "JERSEY" | "PANTS" | "HAT" | "SHIRT" | "OUTERWEAR" | "ACCESSORY";

/** Which roster size column a product reads from. */
export type SizeField = "topSize" | "bottomSize" | "hatSize" | "none";

export type DecorationMethodId = "EMBROIDERY" | "SCREEN_PRINT" | "HEAT_TRANSFER" | "TACKLE_TWILL";

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
  shape: "jersey" | "pants" | "hat" | "tee" | "hoodie" | "bag";
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
