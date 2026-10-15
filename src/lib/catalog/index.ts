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

import type { Box, Catalog, ColorOption, DecorationMethod, DecorationMethodId, Product, ProductPhoto } from "./types";
import PHOTO_META from "./photo-meta.json";

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

const decorationMethods = {
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
} as Record<DecorationMethodId, DecorationMethod>;

decorationMethods.FULL_COLOR_PRINT = {
  id: "FULL_COLOR_PRINT",
  label: "Full-color print",
  description: "Photo-quality print of any logo, any number of colors.",
  tiers: [
    { minQty: 1, unitCents: 300 },
    { minQty: 24, unitCents: 250 },
    { minQty: 96, unitCents: 200 },
  ],
  setupCents: 0,
  setupOneTimePerLogo: false,
  minQty: 1,
};
decorationMethods.VINYL_DECAL = {
  id: "VINYL_DECAL",
  label: "Die-cut vinyl decal",
  description: "Weatherproof decal cut to the exact shape of your logo. Gloss or matte.",
  tiers: [
    { minQty: 1, unitCents: 400 },
    { minQty: 24, unitCents: 300 },
    { minQty: 96, unitCents: 250 },
  ],
  setupCents: 2500,
  setupOneTimePerLogo: true, // the cut file is kept on file
  minQty: 1,
};
decorationMethods.INCLUDED = {
  id: "INCLUDED",
  label: "Custom print (included)",
  description: "Your logo is printed as part of the product — no extra charge.",
  tiers: [{ minQty: 1, unitCents: 0 }],
  setupCents: 0,
  setupOneTimePerLogo: false,
  minQty: 1,
};

/** Apparel size -> youth/adult product sizes. */
const YOUTH_ADULT = (youth: string, adult: string) => ({
  YS: youth, YM: youth, YL: youth, YXL: youth, S: adult, M: adult, L: adult, XL: adult, "2XL": adult, "3XL": adult,
});

/** A product photo from public/products, with its measured shading range. */
function photo(file: keyof typeof PHOTO_META, color: string, boxes: Record<string, Box>, extra: Partial<ProductPhoto> = {}): ProductPhoto {
  const m = PHOTO_META[file];
  return { src: `/products/${file}.webp`, color, recolor: true, material: m.material as "dark" | "light", lo: m.lo, hi: m.hi, boxes, ...extra };
}

const products: Product[] = [
  {
    id: "jersey-full-button",
    sku: "CC-JB100",
    photo: photo("jersey-full-button-black", "black", { "front-chest": { x: 46, y: 60, w: 108, h: 36 }, "left-chest": { x: 113, y: 50, w: 26, h: 26 }, "left-sleeve": { x: 161, y: 54, w: 18, h: 18 } }),
    name: "Pro Full-Button Jersey",
    category: "JERSEY",
    group: "uniforms",
    tagline: "Game-day jersey with tackle twill or printed team name.",
    orderUnit: "player",
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
    photo: photo("pants-piped-gray", "gray", { "left-hip": { x: 117, y: 34, w: 20, h: 20 } }),
    name: "Pro Piped Baseball Pants",
    category: "PANTS",
    group: "uniforms",
    tagline: "Double-knit with contrast piping.",
    orderUnit: "player",
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
    photo: photo("hat-stretch-fit-black", "black", { front: { x: 70, y: 50, w: 60, h: 50 } }),
    name: "Structured Stretch-Fit Cap",
    category: "HAT",
    group: "headwear",
    tagline: "3D-embroidered fitted cap.",
    orderUnit: "player",
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
    photo: photo("bp-tee-black", "black", { "front-center": { x: 66, y: 60, w: 68, h: 56 }, "left-chest": { x: 116, y: 54, w: 24, h: 24 } }),
    name: "Performance Batting Practice Tee",
    category: "SHIRT",
    group: "apparel",
    tagline: "Lightweight BP and warmup tee.",
    orderUnit: "player",
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
    photo: photo("fleece-hoodie-black", "black", { "front-center": { x: 75, y: 54, w: 50, h: 42 } }),
    name: "Team Fleece Hoodie",
    category: "OUTERWEAR",
    group: "apparel",
    tagline: "Travel-day fleece with your logo.",
    orderUnit: "player",
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
    photo: photo("equipment-bag-black", "black", { "front-panel": { x: 78, y: 98, w: 44, h: 40 } }),
    name: "Team Equipment Backpack",
    category: "ACCESSORY",
    group: "gear",
    tagline: "Bat pack with embroidered logo.",
    orderUnit: "player",
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

  // ---------------------------------------------------------------------------
  // Helmets & headwear
  // ---------------------------------------------------------------------------
  {
    id: "batting-helmet",
    sku: "CC-BH800",
    photo: photo("batting-helmet-black", "black", { front: { x: 110, y: 53, w: 27, h: 33, fit: "fill" }, side: { x: 44, y: 60, w: 44, h: 40 } }),
    name: "Custom Batting Helmet",
    category: "HELMET",
    group: "headwear",
    shape: "helmet",
    tagline: "Your colors, logo decal on the front, player numbers on the back.",
    orderUnit: "player",
    description: "NOCSAE-certified batting helmet in your team color with die-cut logo decals and back numbers applied.",
    features: ["Meets NOCSAE standard", "Matte or gloss team colors", "Decals applied before shipping"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier E",
    colors: [BLACK, NAVY, ROYAL, RED, MAROON, FOREST, GRAY, WHITE],
    sizes: ["JR", "SR"],
    sizeField: "mapped",
    sizeMap: YOUTH_ADULT("JR", "SR"),
    sizeUpcharges: { SR: 400 },
    minQty: 6,
    leadTimeDays: [12, 18],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 6, unitCents: 5800 },
        { minQty: 12, unitCents: 5200 },
        { minQty: 24, unitCents: 4800 },
      ],
      maxAutoQty: 300,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "front", label: "Front center decal", view: "front", methods: ["VINYL_DECAL"], box: { x: 150, y: 56, w: 26, h: 36 }, maxSizeIn: '3" × 2.5"' },
      { id: "side", label: "Side logo decal", view: "front", methods: ["VINYL_DECAL"], box: { x: 92, y: 70, w: 52, h: 46 }, maxSizeIn: '3" × 3"' },
      { id: "back-logo", label: "Back logo decal", view: "back", methods: ["VINYL_DECAL"], box: { x: 84, y: 60, w: 32, h: 26 }, maxSizeIn: '2" × 1.5"' },
    ],
    personalization: {
      numbers: { unitCents: 300, label: "Player number decal (back)" },
    },
  },
  {
    id: "helmet-decal-kit",
    sku: "CC-HD810",
    photo: photo("helmet-decal-kit", "white", { logo: { x: 30, y: 40, w: 76, h: 76 } }, { recolor: false, copies: { logo: [{ x: 44, y: 138, w: 32, h: 32 }] }, number: { x: 147, y: 128, size: 54 } }),
    name: "Helmet Decal Kit",
    category: "HELMET",
    group: "headwear",
    shape: "decal",
    tagline: "Logo decals + numbers for the helmets you already own.",
    orderUnit: "player",
    unitLabel: "kit",
    description: "One kit per helmet: two die-cut side logos plus a player number for the back. Weatherproof vinyl.",
    features: ["2 side logos + 1 number per kit", "Gloss, matte or chrome", "Applies in minutes"],
    sports: ["BASEBALL", "SOFTBALL", "FOOTBALL", "LACROSSE"],
    supplier: "Sample Supplier E",
    colors: [WHITE, GOLD, RED, ROYAL, BLACK, C("chrome", "Chrome", "#c9ced6")],
    sizes: ["OS"],
    sizeField: "none",
    sizeUpcharges: {},
    minQty: 10,
    leadTimeDays: [5, 8],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 10, unitCents: 600 },
        { minQty: 25, unitCents: 500 },
        { minQty: 50, unitCents: 400 },
      ],
      maxAutoQty: 2000,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "logo", label: "Logo decal", view: "front", methods: ["INCLUDED"], box: { x: 24, y: 40, w: 70, h: 70 }, maxSizeIn: '3" × 3"' },
    ],
    personalization: {
      numbers: { unitCents: 0, label: "Player number (included)" },
    },
  },
  // ---------------------------------------------------------------------------
  // Player gear
  // ---------------------------------------------------------------------------
  {
    id: "batting-gloves",
    sku: "CC-BG820",
    photo: photo("batting-gloves-black", "black", { backhand: { x: 70, y: 88, w: 44, h: 38 } }),
    name: "Custom Batting Gloves",
    category: "GLOVES",
    group: "gear",
    shape: "glove",
    tagline: "Team-color leather with your logo on the back of the hand.",
    orderUnit: "player",
    unitLabel: "pair",
    description: "Sheepskin-palm batting gloves in your team color with your logo printed on the back of the hand.",
    features: ["Sheepskin leather palm", "Team-color backhand", "Neoprene wrist strap"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier F",
    colors: [BLACK, NAVY, ROYAL, RED, MAROON, FOREST, WHITE, GOLD],
    sizes: ["YS", "YM", "YL", "S", "M", "L", "XL"],
    sizeField: "mapped",
    sizeMap: { YS: "YS", YM: "YM", YL: "YL", YXL: "YL", S: "S", M: "M", L: "L", XL: "XL", "2XL": "XL", "3XL": "XL" },
    sizeUpcharges: {},
    minQty: 12,
    leadTimeDays: [15, 20],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 3800 },
        { minQty: 24, unitCents: 3400 },
        { minQty: 48, unitCents: 3100 },
      ],
      maxAutoQty: 500,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "backhand", label: "Back of hand", view: "front", methods: ["FULL_COLOR_PRINT"], box: { x: 74, y: 92, w: 52, h: 44 }, maxSizeIn: '2" × 2"' },
    ],
    personalization: {
      numbers: { unitCents: 300, label: "Number on wrist strap" },
    },
  },
  {
    id: "sliding-mitt",
    sku: "CC-SM830",
    photo: photo("sliding-mitt-black", "black", { back: { x: 70, y: 58, w: 52, h: 48 } }),
    name: "Custom Sliding Mitt",
    category: "GLOVES",
    group: "gear",
    shape: "mitt",
    tagline: "Protects hands on headfirst slides — in team colors.",
    orderUnit: "player",
    description: "Padded sliding mitt with a rigid finger guard, finished in your team color with your logo on the back.",
    features: ["Rigid finger protection", "Adjustable wrist strap", "Fits either hand"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier F",
    colors: [BLACK, NAVY, ROYAL, RED, MAROON, FOREST, GRAY, WHITE],
    sizes: ["Youth", "Adult"],
    sizeField: "mapped",
    sizeMap: YOUTH_ADULT("Youth", "Adult"),
    sizeUpcharges: {},
    minQty: 6,
    leadTimeDays: [12, 18],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 6, unitCents: 2400 },
        { minQty: 12, unitCents: 2100 },
        { minQty: 24, unitCents: 1900 },
      ],
      maxAutoQty: 400,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "back", label: "Back panel", view: "front", methods: ["FULL_COLOR_PRINT", "EMBROIDERY"], box: { x: 68, y: 96, w: 64, h: 52 }, maxSizeIn: '3" × 3"' },
    ],
    personalization: {
      numbers: { unitCents: 300, label: "Player number" },
    },
  },
  {
    id: "baseball-belt",
    sku: "CC-BB840",
    photo: photo("baseball-belt-black", "black", { strap: { x: 62, y: 100, w: 36, h: 17 } }),
    name: "Custom Team Belt",
    category: "BELT",
    group: "uniforms",
    shape: "belt",
    tagline: "Elastic game belt with your logo on the strap.",
    orderUnit: "player",
    description: "1.5\" elastic baseball belt with a leather tab and your logo printed on the strap.",
    features: ["1.5\" elastic webbing", "Leather tab & roller buckle", "Matches your uniform color"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier F",
    colors: [BLACK, NAVY, ROYAL, RED, MAROON, FOREST, GRAY, WHITE],
    sizes: ["Youth", "Adult S/M", "Adult L/XL", "Adult 2XL+"],
    sizeField: "mapped",
    sizeMap: { YS: "Youth", YM: "Youth", YL: "Youth", YXL: "Youth", S: "Adult S/M", M: "Adult S/M", L: "Adult L/XL", XL: "Adult L/XL", "2XL": "Adult 2XL+", "3XL": "Adult 2XL+" },
    sizeUpcharges: {},
    minQty: 12,
    leadTimeDays: [8, 12],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 1400 },
        { minQty: 24, unitCents: 1200 },
        { minQty: 48, unitCents: 1100 },
      ],
      maxAutoQty: 1000,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "strap", label: "Logo on strap", view: "front", methods: ["FULL_COLOR_PRINT"], box: { x: 86, y: 80, w: 40, h: 40 }, maxSizeIn: '1.25" tall' },
    ],
    personalization: {},
  },
  {
    id: "arm-sleeve",
    sku: "CC-AS850",
    photo: photo("arm-sleeve-black", "black", { upper: { x: 84, y: 28, w: 30, h: 30 } }, { number: { x: 99, y: 112, size: 30 } }),
    name: "Compression Arm Sleeve",
    category: "GAMEDAY",
    group: "gear",
    shape: "sleeve",
    tagline: "Sublimated sleeve with logo and number.",
    orderUnit: "player",
    description: "Moisture-wicking compression sleeve, fully sublimated in your colors with your logo and number.",
    features: ["UPF 50 compression knit", "Silicone gripper", "Logo + number included"],
    sports: ["BASEBALL", "SOFTBALL", "BASKETBALL", "FOOTBALL"],
    supplier: "Sample Supplier G",
    colors: TEAM_COLORS,
    sizes: ["Youth", "Adult S/M", "Adult L/XL"],
    sizeField: "mapped",
    sizeMap: { YS: "Youth", YM: "Youth", YL: "Youth", YXL: "Youth", S: "Adult S/M", M: "Adult S/M", L: "Adult L/XL", XL: "Adult L/XL", "2XL": "Adult L/XL", "3XL": "Adult L/XL" },
    sizeUpcharges: {},
    minQty: 12,
    leadTimeDays: [10, 14],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 1500 },
        { minQty: 24, unitCents: 1300 },
        { minQty: 48, unitCents: 1150 },
      ],
      maxAutoQty: 1000,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "upper", label: "Upper arm", view: "front", methods: ["INCLUDED"], box: { x: 74, y: 30, w: 52, h: 44 }, maxSizeIn: '3" × 3"' },
    ],
    personalization: {
      numbers: { unitCents: 0, label: "Player number (included)" },
    },
  },
  {
    id: "team-socks",
    sku: "CC-TS860",
    photo: photo("team-socks-black", "black", { calf: { x: 54, y: 42, w: 38, h: 38 } }),
    name: "Custom Knit Team Socks",
    category: "SOCKS",
    group: "uniforms",
    shape: "socks",
    tagline: "Knee-high socks with your logo knit right in.",
    orderUnit: "player",
    unitLabel: "pair",
    description: "Cushioned knee-high performance socks with your colors, stripes and logo knit in.",
    features: ["Cushioned foot", "Knit-in logo (won't peel)", "Arch compression"],
    sports: ["BASEBALL", "SOFTBALL", "SOCCER", "FOOTBALL", "LACROSSE"],
    supplier: "Sample Supplier G",
    colors: TEAM_COLORS,
    sizes: ["S", "M", "L", "XL"],
    sizeField: "mapped",
    sizeMap: { YS: "S", YM: "S", YL: "M", YXL: "M", S: "M", M: "L", L: "L", XL: "XL", "2XL": "XL", "3XL": "XL" },
    sizeUpcharges: {},
    minQty: 24,
    leadTimeDays: [15, 20],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 24, unitCents: 1200 },
        { minQty: 48, unitCents: 1000 },
        { minQty: 96, unitCents: 900 },
      ],
      maxAutoQty: 2000,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "calf", label: "Calf logo", view: "front", methods: ["INCLUDED"], box: { x: 74, y: 52, w: 44, h: 40 }, maxSizeIn: '2.5" × 2.5"' },
    ],
    personalization: {},
  },
  // ---------------------------------------------------------------------------
  // Bat & game-day accessories
  // ---------------------------------------------------------------------------
  {
    id: "bat-grip",
    sku: "CC-GT870",
    photo: photo("bat-grip-black", "black", { handle: { x: 89, y: 70, w: 22, h: 22 } }, { copies: { handle: [{ x: 89, y: 124, w: 22, h: 22 }] } }),
    name: "Custom Printed Bat Grip",
    category: "BAT",
    group: "gameday",
    shape: "grip",
    tagline: "1.1mm grip tape printed with your logo.",
    orderUnit: "player",
    description: "Tacky 1.1mm polyurethane bat grip in your team color, printed with your logo down the handle.",
    features: ["1.1mm tacky PU", "Fits any bat", "Logo print included"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier H",
    colors: [BLACK, NAVY, ROYAL, RED, MAROON, FOREST, WHITE, GOLD, ORANGE, PURPLE],
    sizes: ["OS"],
    sizeField: "none",
    sizeUpcharges: {},
    minQty: 12,
    leadTimeDays: [8, 12],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 1400 },
        { minQty: 24, unitCents: 1200 },
        { minQty: 48, unitCents: 1050 },
      ],
      maxAutoQty: 1500,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "handle", label: "Printed down the handle", view: "front", methods: ["INCLUDED"], box: { x: 82, y: 86, w: 36, h: 36 }, maxSizeIn: '1" tall' },
    ],
    personalization: {
      numbers: { unitCents: 0, label: "Player number (included)" },
    },
  },
  {
    id: "pine-tar",
    sku: "CC-PT880",
    photo: photo("pine-tar", "black", { label: { x: 72, y: 78, w: 56, h: 56 } }),
    name: "Custom-Label Pine Tar Stick",
    category: "BAT",
    group: "gameday",
    shape: "pinetar",
    tagline: "Dugout pine tar with your team's label.",
    orderUnit: "team",
    unitLabel: "stick",
    defaultTeamQty: 12,
    description: "Professional-grade pine tar stick with a custom full-color label featuring your logo.",
    features: ["Mess-free stick applicator", "Full-color custom label", "Ships in a dugout box"],
    sports: ["BASEBALL", "SOFTBALL"],
    supplier: "Sample Supplier H",
    colors: [BLACK, NAVY, RED, ROYAL, MAROON, FOREST],
    sizes: ["OS"],
    sizeField: "none",
    sizeUpcharges: {},
    minQty: 12,
    leadTimeDays: [7, 10],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 900 },
        { minQty: 24, unitCents: 800 },
        { minQty: 48, unitCents: 700 },
      ],
      maxAutoQty: 2000,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "label", label: "Label", view: "front", methods: ["INCLUDED"], box: { x: 78, y: 104, w: 44, h: 44 }, maxSizeIn: "Full label" },
    ],
    personalization: {},
  },
  {
    id: "wrist-tape",
    sku: "CC-WT890",
    photo: photo("wrist-tape-black", "black", { repeat: { x: 122, y: 101, w: 26, h: 26 } }, { copies: { repeat: [{ x: 154, y: 102, w: 24, h: 24 }, { x: 42, y: 110, w: 28, h: 28 }] } }),
    name: "Custom Printed Wrist Tape",
    category: "GAMEDAY",
    group: "gameday",
    shape: "tape",
    tagline: "Athletic tape with your logo repeated on every inch.",
    orderUnit: "team",
    unitLabel: "roll",
    defaultTeamQty: 24,
    description: "1.5\" cotton athletic tape printed with your logo in a repeating pattern. Great for wrists and bat handles.",
    features: ["1.5\" × 15 yd rolls", "Easy tear by hand", "Repeating logo print"],
    sports: ["BASEBALL", "SOFTBALL", "FOOTBALL", "BASKETBALL", "LACROSSE", "OTHER"],
    supplier: "Sample Supplier H",
    colors: [WHITE, BLACK, NAVY, ROYAL, RED, MAROON, FOREST, GOLD],
    sizes: ["OS"],
    sizeField: "none",
    sizeUpcharges: {},
    minQty: 24,
    leadTimeDays: [7, 10],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 24, unitCents: 650 },
        { minQty: 48, unitCents: 550 },
        { minQty: 96, unitCents: 450 },
      ],
      maxAutoQty: 5000,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "repeat", label: "Repeating print", view: "front", methods: ["INCLUDED"], box: { x: 128, y: 60, w: 34, h: 34 }, maxSizeIn: '1.25" tall' },
    ],
    personalization: {},
  },
  {
    id: "eye-black",
    sku: "CC-EB900",
    photo: photo("eye-black", "black", { strip: { x: 74, y: 68, w: 52, h: 26 } }, { recolor: false, copies: { strip: [{ x: 74, y: 114, w: 52, h: 26 }] }, number: { x: 99, y: 136, size: 24 } }),
    name: "Custom Eye Black Strips",
    category: "GAMEDAY",
    group: "gameday",
    shape: "eyeblack",
    tagline: "Logo or player number printed on eye black stickers.",
    orderUnit: "player",
    unitLabel: "pack of 12 pairs",
    description: "Anti-glare eye black stickers printed with your logo — or each player's own number.",
    features: ["12 pairs per pack", "Sweat-resistant adhesive", "Logo or number print"],
    sports: ["BASEBALL", "SOFTBALL", "FOOTBALL", "LACROSSE"],
    supplier: "Sample Supplier H",
    colors: [WHITE, GOLD, RED, ROYAL, C("silver", "Silver", "#c0c4cc")],
    sizes: ["OS"],
    sizeField: "none",
    sizeUpcharges: {},
    minQty: 12,
    leadTimeDays: [5, 8],
    pricing: {
      status: "VERIFIED",
      tiers: [
        { minQty: 12, unitCents: 700 },
        { minQty: 24, unitCents: 600 },
        { minQty: 48, unitCents: 500 },
      ],
      maxAutoQty: 3000,
      source: SAMPLE_SOURCE,
      verifiedAt: null,
    },
    locations: [
      { id: "strip", label: "Printed on each strip", view: "front", methods: ["INCLUDED"], box: { x: 42, y: 96, w: 30, h: 26 }, maxSizeIn: '0.75" tall' },
    ],
    personalization: {
      numbers: { unitCents: 0, label: "Player number on strips (included)" },
    },
  },
  {
    id: "sublimated-jersey",
    sku: "CC-SJ700",
    name: "Fully Sublimated Custom Jersey",
    category: "JERSEY",
    group: "uniforms",
    tagline: "Completely custom all-over design.",
    orderUnit: "player",
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
  ACCESSORY: "Bags",
  HELMET: "Helmets & decals",
  GLOVES: "Batting gloves & mitts",
  BELT: "Belts",
  SOCKS: "Socks",
  BAT: "Bat grips & pine tar",
  GAMEDAY: "Game-day accessories",
};

export const GROUPS: { id: Product["group"]; label: string; blurb: string }[] = [
  { id: "uniforms", label: "Uniforms", blurb: "Jerseys, pants, belts & socks" },
  { id: "headwear", label: "Helmets & caps", blurb: "Custom helmets, decals & fitted caps" },
  { id: "gear", label: "Player gear", blurb: "Batting gloves, sliding mitts, sleeves & bags" },
  { id: "gameday", label: "Game-day extras", blurb: "Grips, pine tar, wrist tape & eye black" },
  { id: "apparel", label: "Practice & travel", blurb: "BP tees & hoodies" },
];

/** The "full uniform kit" from our core user story: jersey, pants, hat, BP tee. */
export const UNIFORM_KIT_PRODUCT_IDS = ["jersey-full-button", "pants-piped", "hat-stretch-fit", "bp-tee"];

export function lowestUnitCents(p: Product): number | null {
  if (p.pricing.status !== "VERIFIED" || p.pricing.tiers.length === 0) return null;
  return Math.min(...p.pricing.tiers.map((t) => t.unitCents));
}
