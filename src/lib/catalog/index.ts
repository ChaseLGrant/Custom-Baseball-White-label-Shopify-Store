// =============================================================================
// THE CLUB CUSTOM CATALOG
// =============================================================================
//
// ⚠️  SAMPLE DATA. Every price below is a PLACEHOLDER, not a real supplier price.
//
// Before taking real orders:
//   1. Replace each product's price tiers, decoration prices and setup fees with
//      the numbers from your supplier's current price list (plus your margin).
//   2. Set pricing.source and pricing.verifiedAt for each product.
//   3. Bump CATALOG.version and set CATALOG.isSample = false.
//
// Anything you cannot price reliably should use status "QUOTE_REQUIRED" — the
// site will then route those orders to pricing review instead of promising an
// instant price. See docs/CATALOG.md.
// =============================================================================

import type { Catalog, ColorOption, DecorationMethod, DecorationMethodId, Product } from "./types";

export * from "./types";

const ADULT_YOUTH = ["YS", "YM", "YL", "YXL", "S", "M", "L", "XL", "2XL", "3XL"];
const BIG_SIZE_UPCHARGES = { "2XL": 200, "3XL": 400 };

const C = (id: string, name: string, hex: string): ColorOption => ({ id, name, hex });
const WHITE = C("white", "White", "#ffffff");
const GRAY = C("gray", "Gray", "#a9adb3");
const BLACK = C("black", "Black", "#1c1c1e");
const NAVY = C("navy", "Navy", "#13294b");
const ROYAL = C("royal", "Royal", "#1f4fb4");
const RED = C("red", "Scarlet", "#c8102e");
const MAROON = C("maroon", "Maroon", "#6d1f2c");
const FOREST = C("forest", "Forest", "#1f4d2b");
const GOLD = C("gold", "Gold", "#f2b632");
const ORANGE = C("orange", "Orange", "#e5621c");
const PURPLE = C("purple", "Purple", "#4b2a85");
const TEAM_COLORS = [WHITE, GRAY, BLACK, NAVY, ROYAL, RED, MAROON, FOREST, GOLD, ORANGE, PURPLE];

const SAMPLE_SOURCE = "SAMPLE — replace with supplier price list";

const decorationMethods: Record<DecorationMethodId, DecorationMethod> = {
  EMBROIDERY: {
    id: "EMBROIDERY",
    label: "Embroidery",
    description: "Stitched logo. Premium look; best for caps and chest logos.",
    tiers: [
      { minQty: 1, unitCents: 800 },
      { minQty: 24, unitCents: 700 },
      { minQty: 48, unitCents: 600 },
      { minQty: 96, unitCents: 500 },
    ],
    setupCents: 4000,
    setupOneTimePerLogo: true, // digitizing is kept on file
    minQty: 1,
  },
  SCREEN_PRINT: {
    id: "SCREEN_PRINT",
    label: "Screen print",
    description: "Ink printed directly on fabric. Most economical for larger runs.",
    tiers: [
      { minQty: 12, unitCents: 500 },
      { minQty: 48, unitCents: 400 },
      { minQty: 96, unitCents: 300 },
    ],
    setupCents: 2500,
    setupOneTimePerLogo: false, // new screens each run
    minQty: 12,
  },
  HEAT_TRANSFER: {
    id: "HEAT_TRANSFER",
    label: "Heat transfer",
    description: "Full-color pressed transfer. Great for detailed logos.",
    tiers: [
      { minQty: 1, unitCents: 450 },
      { minQty: 24, unitCents: 400 },
      { minQty: 96, unitCents: 350 },
    ],
    setupCents: 0,
    setupOneTimePerLogo: false,
    minQty: 1,
  },
  TACKLE_TWILL: {
    id: "TACKLE_TWILL",
    label: "Tackle twill",
    description: "Sewn-on layered fabric lettering. The classic pro jersey look.",
    tiers: [
      { minQty: 1, unitCents: 1400 },
      { minQty: 24, unitCents: 1200 },
      { minQty: 48, unitCents: 1100 },
    ],
    setupCents: 3500,
    setupOneTimePerLogo: true,
    minQty: 1,
  },
};

const products: Product[] = [
  {
    id: "jersey-full-button",
    sku: "CC-JB100",
    name: "Pro Full-Button Jersey",
    category: "JERSEY",
    shape: "jersey",
    description: "Moisture-wicking mesh full-button baseball/softball jersey with a tagless collar.",
    features: ["Moisture-wicking 100% polyester", "Tagless neck label", "Adult & youth sizes"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier A",
    colors: TEAM_COLORS,
    sizes: ADULT_YOUTH,
    sizeField: "topSize",
    sizeUpcharges: BIG_SIZE_UPCHARGES,
    minQty: 12,
    leadTimeDays: [10, 15],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 4200 },
        { minQty: 24, unitCents: 3800 },
        { minQty: 48, unitCents: 3500 },
        { minQty: 96, unitCents: 3200 },
      ],
      maxAutoQty: 600,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "front-chest", label: "Front chest (team name)", view: "front", methods: ["TACKLE_TWILL", "HEAT_TRANSFER", "EMBROIDERY"], box: { x: 55, y: 70, w: 90, h: 40 }, maxSizeIn: '12" × 5"' },
      { id: "left-chest", label: "Left chest", view: "front", methods: ["EMBROIDERY", "HEAT_TRANSFER"], box: { x: 112, y: 60, w: 30, h: 30 }, maxSizeIn: '3.5" × 3.5"' },
      { id: "left-sleeve", label: "Left sleeve", view: "front", methods: ["EMBROIDERY", "HEAT_TRANSFER"], box: { x: 158, y: 50, w: 24, h: 24 }, maxSizeIn: '3" × 3"' },
      { id: "back-upper", label: "Back yoke", view: "back", methods: ["EMBROIDERY", "HEAT_TRANSFER"], box: { x: 80, y: 38, w: 40, h: 16 }, maxSizeIn: '4" × 2"' },
    ],
    personalization: {
      names: { unitCents: 700, label: "Player name (back)" },
      numbers: { unitCents: 900, label: "Player number (back, 8\")" },
    },
  },
  {
    id: "pants-piped",
    sku: "CC-PP200",
    name: "Pro Piped Baseball Pants",
    category: "PANTS",
    shape: "pants",
    description: "Relaxed-fit double-knit pants with contrast piping and reinforced knees.",
    features: ["14 oz double-knit", "Reinforced knees", "Belt loops & hidden elastic"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier A",
    colors: [WHITE, GRAY, BLACK],
    sizes: ADULT_YOUTH,
    sizeField: "bottomSize",
    sizeUpcharges: BIG_SIZE_UPCHARGES,
    minQty: 12,
    leadTimeDays: [10, 15],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 2800 },
        { minQty: 24, unitCents: 2500 },
        { minQty: 48, unitCents: 2300 },
        { minQty: 96, unitCents: 2100 },
      ],
      maxAutoQty: 600,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "left-hip", label: "Left hip", view: "front", methods: ["EMBROIDERY", "HEAT_TRANSFER"], box: { x: 112, y: 40, w: 28, h: 28 }, maxSizeIn: '3" × 3"' },
    ],
    personalization: {},
  },
  {
    id: "hat-stretch-fit",
    sku: "CC-HS300",
    name: "Structured Stretch-Fit Cap",
    category: "HAT",
    shape: "hat",
    description: "Six-panel structured cap with a pre-curved visor. Embroidered logos only.",
    features: ["Structured 6-panel crown", "Pre-curved visor", "Fitted stretch band"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier B",
    colors: [BLACK, NAVY, ROYAL, RED, MAROON, FOREST, GRAY, WHITE],
    sizes: ["XS/S", "S/M", "M/L", "L/XL"],
    sizeField: "hatSize",
    sizeUpcharges: {},
    minQty: 12,
    leadTimeDays: [8, 12],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 1600 },
        { minQty: 24, unitCents: 1400 },
        { minQty: 48, unitCents: 1250 },
        { minQty: 96, unitCents: 1100 },
      ],
      maxAutoQty: 1000,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "front", label: "Front (3D embroidery area)", view: "front", methods: ["EMBROIDERY"], box: { x: 72, y: 62, w: 56, h: 46 }, maxSizeIn: '4.25" × 2.25"' },
      { id: "back", label: "Back above strap", view: "back", methods: ["EMBROIDERY"], box: { x: 86, y: 92, w: 28, h: 18 }, maxSizeIn: '2.5" × 1"' },
    ],
    personalization: {},
  },
  {
    id: "bp-tee",
    sku: "CC-BP400",
    name: "Performance Batting Practice Tee",
    category: "SHIRT",
    shape: "tee",
    description: "Lightweight performance tee for batting practice and warmups.",
    features: ["Lightweight performance knit", "Anti-microbial", "Adult & youth sizes"],
    sports: ["BASEBALL", "SOFTBALL", "FOOTBALL", "BASKETBALL", "SOCCER", "VOLLEYBALL", "LACROSSE", "TRACK", "OTHER"],
    supplier: "Sample Supplier B",
    colors: TEAM_COLORS,
    sizes: ADULT_YOUTH,
    sizeField: "topSize",
    sizeUpcharges: BIG_SIZE_UPCHARGES,
    minQty: 12,
    leadTimeDays: [7, 10],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 1800 },
        { minQty: 24, unitCents: 1500 },
        { minQty: 48, unitCents: 1350 },
        { minQty: 96, unitCents: 1200 },
      ],
      maxAutoQty: 1500,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "front-center", label: "Front center", view: "front", methods: ["SCREEN_PRINT", "HEAT_TRANSFER"], box: { x: 60, y: 62, w: 80, h: 60 }, maxSizeIn: '11" × 8"' },
      { id: "left-chest", label: "Left chest", view: "front", methods: ["SCREEN_PRINT", "HEAT_TRANSFER", "EMBROIDERY"], box: { x: 112, y: 58, w: 28, h: 28 }, maxSizeIn: '3.5" × 3.5"' },
      { id: "back-center", label: "Back center", view: "back", methods: ["SCREEN_PRINT", "HEAT_TRANSFER"], box: { x: 60, y: 60, w: 80, h: 70 }, maxSizeIn: '11" × 11"' },
    ],
    personalization: {
      names: { unitCents: 600, label: "Player name (back)" },
      numbers: { unitCents: 600, label: "Player number (back)" },
    },
  },
  {
    id: "fleece-hoodie",
    sku: "CC-FH500",
    name: "Team Fleece Hoodie",
    category: "OUTERWEAR",
    shape: "hoodie",
    description: "Mid-weight fleece hoodie for travel days and cold games.",
    features: ["9 oz fleece", "Lined hood", "Front pouch pocket"],
    sports: ["BASEBALL", "SOFTBALL", "FOOTBALL", "BASKETBALL", "SOCCER", "VOLLEYBALL", "LACROSSE", "TRACK", "OTHER"],
    supplier: "Sample Supplier B",
    colors: [BLACK, NAVY, GRAY, ROYAL, RED, MAROON, FOREST],
    sizes: ADULT_YOUTH,
    sizeField: "topSize",
    sizeUpcharges: BIG_SIZE_UPCHARGES,
    minQty: 12,
    leadTimeDays: [10, 15],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 3800 },
        { minQty: 24, unitCents: 3400 },
        { minQty: 48, unitCents: 3100 },
        { minQty: 96, unitCents: 2900 },
      ],
      maxAutoQty: 800,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "front-center", label: "Front center", view: "front", methods: ["SCREEN_PRINT", "HEAT_TRANSFER", "EMBROIDERY"], box: { x: 60, y: 70, w: 80, h: 48 }, maxSizeIn: '10" × 6"' },
      { id: "back-center", label: "Back center", view: "back", methods: ["SCREEN_PRINT", "HEAT_TRANSFER"], box: { x: 60, y: 66, w: 80, h: 64 }, maxSizeIn: '11" × 11"' },
    ],
    personalization: {
      names: { unitCents: 700, label: "Player name (back)" },
      numbers: { unitCents: 700, label: "Player number (back)" },
    },
  },
  {
    id: "equipment-bag",
    sku: "CC-EB600",
    name: "Team Equipment Backpack",
    category: "ACCESSORY",
    shape: "bag",
    description: "Bat-pack style backpack with two bat sleeves and a vented shoe compartment.",
    features: ["Holds 2 bats", "Vented shoe compartment", "Fence hook"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier C",
    colors: [BLACK, NAVY, ROYAL, RED, MAROON, GRAY],
    sizes: ["OS"],
    sizeField: "none",
    sizeUpcharges: {},
    minQty: 6,
    leadTimeDays: [8, 12],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 6, unitCents: 5500 },
        { minQty: 24, unitCents: 5000 },
        { minQty: 48, unitCents: 4600 },
      ],
      maxAutoQty: 300,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "front-panel", label: "Front panel", view: "front", methods: ["EMBROIDERY"], box: { x: 70, y: 80, w: 60, h: 50 }, maxSizeIn: '5" × 4"' },
    ],
    personalization: {
      names: { unitCents: 800, label: "Player name (embroidered)" },
    },
  },
  {
    id: "sublimated-jersey",
    sku: "CC-SJ700",
    name: "Fully Sublimated Custom Jersey",
    category: "JERSEY",
    shape: "jersey",
    description:
      "Completely custom all-over design. Each design is reviewed by the manufacturer before pricing, so these orders go through a short pricing review instead of instant checkout.",
    features: ["Unlimited colors & patterns", "Custom cut options", "Manufacturer design review"],
    sports: ["BASEBALL", "SOFTBALL", "BASKETBALL", "SOCCER", "VOLLEYBALL", "LACROSSE", "OTHER"],
    supplier: "Sample Supplier D",
    colors: TEAM_COLORS,
    sizes: ADULT_YOUTH,
    sizeField: "topSize",
    sizeUpcharges: BIG_SIZE_UPCHARGES,
    minQty: 12,
    leadTimeDays: [20, 30],
    pricing: {
      status: "QUOTE_REQUIRED",
      tiers: [],
      maxAutoQty: 0,
      source: "Manufacturer prices each design individually",
      verifiedAt: null,
    },
    locations: [
      { id: "front-chest", label: "Front chest", view: "front", methods: ["HEAT_TRANSFER"], box: { x: 55, y: 70, w: 90, h: 40 }, maxSizeIn: "Any" },
    ],
    personalization: {
      names: { unitCents: 0, label: "Player name (sublimated, included)" },
      numbers: { unitCents: 0, label: "Player number (sublimated, included)" },
    },
  },
];

export const CATALOG: Catalog = {
  version: "sample-2026.10",
  isSample: true,
  products,
  decorationMethods,
  shipping: {
    flatCents: 1500,
    freeOverCents: 50000,
    description: "Flat $15 shipping per address; free on orders over $500.",
  },
};

export function getProduct(id: string): Product | undefined {
  return CATALOG.products.find((p) => p.id === id);
}

export const CATEGORY_LABELS: Record<Product["category"], string> = {
  JERSEY: "Jerseys",
  PANTS: "Pants",
  HAT: "Hats",
  SHIRT: "Practice & warmup",
  OUTERWEAR: "Outerwear",
  ACCESSORY: "Bags & accessories",
};

/** The "full uniform kit" from our core user story: jersey, pants, hat, BP tee. */
export const UNIFORM_KIT_PRODUCT_IDS = ["jersey-full-button", "pants-piped", "hat-stretch-fit", "bp-tee"];

export function lowestUnitCents(p: Product): number | null {
  if (p.pricing.status !== "VERIFIED" || p.pricing.tiers.length === 0) return null;
  return Math.min(...p.pricing.tiers.map((t) => t.unitCents));
}
