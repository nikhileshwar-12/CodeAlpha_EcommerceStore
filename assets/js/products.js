/* ==========================================================================
   NovaCart — product catalogue
   --------------------------------------------------------------------------
   A plain data module. Each record drives one product card, its quick-view
   modal and the cart. Image paths point at the local SVG illustrations in
   /assets/img so the store works completely offline.
   ========================================================================== */

const PRODUCTS = [
  {
    id: 'aurora-headphones',
    name: 'Aurora Studio Headphones',
    category: 'Audio',
    price: 189.0,
    oldPrice: 249.0,
    rating: 4.8,
    reviews: 214,
    stock: 12,
    badge: 'sale',
    image: 'assets/img/headphones.svg',
    blurb: 'Active noise cancelling over-ears with 40-hour battery life.',
    blurb_long:
      'Aurora wraps you in studio-grade sound. Dual 40 mm drivers deliver deep, controlled bass while adaptive noise cancelling silences the commute. Memory-foam ear cushions and a featherweight headband keep long sessions comfortable.',
    specs: [
      'Hybrid active noise cancelling with transparency mode',
      '40-hour playback • 10 min charge = 5 hours',
      'Bluetooth 5.3 multipoint pairing',
      'Foldable frame with hard travel case included'
    ]
  },
  {
    id: 'pulse-watch',
    name: 'Pulse Smart Watch',
    category: 'Wearables',
    price: 159.0,
    oldPrice: null,
    rating: 4.6,
    reviews: 168,
    stock: 23,
    badge: 'new',
    image: 'assets/img/watch.svg',
    blurb: 'AMOLED fitness tracking with a 14-day battery.',
    blurb_long:
      'Pulse keeps a quiet eye on your health. Continuous heart-rate and SpO2 tracking, sleep staging and 120 workout profiles — all on a bright always-on AMOLED display that lasts two weeks between charges.',
    specs: [
      '1.43" always-on AMOLED, 466 × 466 px',
      'Continuous heart rate, SpO2 & sleep staging',
      '120+ sport modes with built-in GPS',
      '5 ATM water resistance • 14-day typical battery'
    ]
  },
  {
    id: 'lumen-speaker',
    name: 'Lumen Bluetooth Speaker',
    category: 'Audio',
    price: 89.5,
    oldPrice: null,
    rating: 4.5,
    reviews: 96,
    stock: 31,
    badge: null,
    image: 'assets/img/speaker.svg',
    blurb: 'Room-filling 360° sound in a palm-sized shell.',
    blurb_long:
      'Small body, big stage. Lumen fires sound in every direction through a passive-radiator design, and the woven recycled-fabric shell shrugs off splashes, sand and light rain.',
    specs: [
      '360° driver array with dual passive radiators',
      '24-hour playtime at 50% volume',
      'IP67 dust and water resistance',
      'Pair two units for true stereo'
    ]
  },
  {
    id: 'vista-camera',
    name: 'Vista 4K Action Camera',
    category: 'Photography',
    price: 279.0,
    oldPrice: 329.0,
    rating: 4.7,
    reviews: 132,
    stock: 7,
    badge: 'sale',
    image: 'assets/img/camera.svg',
    blurb: '4K60 stabilised capture that fits in a pocket.',
    blurb_long:
      'Vista is built for movement. Six-axis gyro stabilisation smooths out rough trails, while the 1/1.7" sensor holds detail in low light. Waterproof to 10 m without a housing.',
    specs: [
      '4K60 / 2.7K120 video • 20 MP stills',
      '6-axis gyro + horizon-lock stabilisation',
      'Waterproof to 10 m, no housing needed',
      'Dual touchscreens with voice control'
    ]
  },
  {
    id: 'nimbus-keyboard',
    name: 'Nimbus Mechanical Keyboard',
    category: 'Accessories',
    price: 129.0,
    oldPrice: null,
    rating: 4.9,
    reviews: 302,
    stock: 18,
    badge: null,
    image: 'assets/img/keyboard.svg',
    blurb: 'Hot-swappable 75% board with a gasket mount.',
    blurb_long:
      'A typing feel that punches far above its price. The gasket-mounted plate and factory-lubed stabilisers produce a deep, muted tone, and every switch pulls out without a soldering iron.',
    specs: [
      '75% layout, hot-swappable 5-pin sockets',
      'Gasket mount with sound-dampening foam',
      'Triple-mode: USB-C, Bluetooth 5.2, 2.4 GHz',
      'Per-key RGB with south-facing LEDs'
    ]
  },
  {
    id: 'stride-shoes',
    name: 'Stride Running Shoes',
    category: 'Apparel',
    price: 119.0,
    oldPrice: null,
    rating: 4.4,
    reviews: 187,
    stock: 26,
    badge: 'new',
    image: 'assets/img/shoes.svg',
    blurb: 'Responsive foam trainer for daily mileage.',
    blurb_long:
      'Stride pairs a supercritical foam midsole with a breathable engineered mesh upper. Light enough for tempo runs, cushioned enough for the long slow days.',
    specs: [
      'Supercritical foam midsole, 8 mm drop',
      'Recycled engineered-mesh upper',
      'Rubber outsole with 3 000 km wear rating',
      'Weighs just 232 g (UK 8)'
    ]
  },
  {
    id: 'nomad-backpack',
    name: 'Nomad Canvas Backpack',
    category: 'Accessories',
    price: 74.25,
    oldPrice: 99.0,
    rating: 4.6,
    reviews: 143,
    stock: 14,
    badge: 'sale',
    image: 'assets/img/backpack.svg',
    blurb: 'Waxed canvas 22 L pack with laptop sleeve.',
    blurb_long:
      'Waxed cotton canvas, solid brass hardware and a padded 16" laptop sleeve. Nomad softens with age instead of wearing out — the kind of bag you keep for a decade.',
    specs: [
      '22 L capacity • fits 16" laptops',
      'Water-repellent waxed cotton canvas',
      'Padded ventilated back panel',
      'Lifetime hardware guarantee'
    ]
  },
  {
    id: 'heritage-jacket',
    name: 'Heritage Denim Jacket',
    category: 'Apparel',
    price: 98.0,
    oldPrice: null,
    rating: 4.3,
    reviews: 88,
    stock: 9,
    badge: null,
    image: 'assets/img/jacket.svg',
    blurb: 'Mid-wash rigid denim with a classic trucker cut.',
    blurb_long:
      'Cut from 12.5 oz rigid selvedge and finished with copper rivets. It starts crisp and fades exactly where you crease it, mapping every trip and season.',
    specs: [
      '12.5 oz rigid selvedge denim',
      'Classic trucker fit, true to size',
      'Antique copper rivets and buttons',
      'Machine washable, hangs to dry'
    ]
  },
  {
    id: 'solstice-sunglasses',
    name: 'Solstice Polarized Sunglasses',
    category: 'Accessories',
    price: 64.0,
    oldPrice: null,
    rating: 4.5,
    reviews: 74,
    stock: 40,
    badge: 'new',
    image: 'assets/img/sunglasses.svg',
    blurb: 'Featherweight acetate frames, polarised lenses.',
    blurb_long:
      'Polarised CR-39 lenses cut glare off water and asphalt while keeping colours neutral. The hand-polished acetate frame weighs almost nothing and holds its shape.',
    specs: [
      '100% UVA/UVB polarised CR-39 lenses',
      'Hand-polished Italian acetate frame',
      'Adjustable spring hinges',
      'Hard case and microfibre pouch included'
    ]
  },
  {
    id: 'halo-lamp',
    name: 'Halo LED Desk Lamp',
    category: 'Home & Living',
    price: 54.0,
    oldPrice: null,
    rating: 4.7,
    reviews: 121,
    stock: 22,
    badge: null,
    image: 'assets/img/lamp.svg',
    blurb: 'Flicker-free, dimmable light with wireless charging.',
    blurb_long:
      'Halo renders colour honestly at CRI 95, so late-night design work looks the way it will in daylight. Stepless dimming from a warm 2700 K to a focused 6500 K.',
    specs: [
      'CRI 95+ flicker-free LED panel',
      '2700 K – 6500 K stepless tuning',
      'Integrated 10 W Qi wireless charging base',
      'Memory function recalls your last setting'
    ]
  },
  {
    id: 'terra-mugs',
    name: 'Terra Ceramic Mug Set',
    category: 'Home & Living',
    price: 38.5,
    oldPrice: null,
    rating: 4.8,
    reviews: 265,
    stock: 54,
    badge: null,
    image: 'assets/img/mug.svg',
    blurb: 'Set of four stoneware mugs with reactive glaze.',
    blurb_long:
      'Thrown from speckled stoneware and finished in a reactive glaze, so no two mugs are quite the same. Thick walls hold heat far longer than thin porcelain.',
    specs: [
      'Set of four • 350 ml each',
      'Speckled stoneware, reactive glaze',
      'Dishwasher and microwave safe',
      'Hand-finished in small batches'
    ]
  },
  {
    id: 'breeze-throw',
    name: 'Breeze Linen Throw',
    category: 'Home & Living',
    price: 69.0,
    oldPrice: 89.0,
    rating: 4.6,
    reviews: 59,
    stock: 11,
    badge: 'sale',
    image: 'assets/img/throw.svg',
    blurb: 'Stonewashed pure linen that breathes year round.',
    blurb_long:
      'Woven from European flax and stonewashed twice for a lived-in softness. Warm in winter, breathable in summer, and it gets softer with every wash.',
    specs: [
      '100% European flax linen',
      '130 × 170 cm with hand-knotted fringe',
      'Stonewashed for immediate softness',
      'OEKO-TEX certified, machine washable'
    ]
  },
  {
    id: 'vertex-wallet',
    name: 'Vertex Leather Wallet',
    category: 'Accessories',
    price: 45.0,
    oldPrice: null,
    rating: 4.4,
    reviews: 176,
    stock: 63,
    badge: null,
    image: 'assets/img/wallet.svg',
    blurb: 'Full-grain bifold with RFID shielding.',
    blurb_long:
      'Cut from full-grain vegetable-tanned hide and stitched with waxed thread. Eight card slots, a bill compartment and a hidden pocket, all with RFID-blocking lining.',
    specs: [
      'Full-grain vegetable-tanned leather',
      '8 card slots + hidden cash pocket',
      'RFID-blocking lining',
      'Slim 11 mm profile, hand-stitched edges'
    ]
  },
  {
    id: 'trail-bottle',
    name: 'Trail Insulated Bottle',
    category: 'Accessories',
    price: 32.0,
    oldPrice: null,
    rating: 4.5,
    reviews: 208,
    stock: 48,
    badge: null,
    image: 'assets/img/bottle.svg',
    blurb: 'Keeps drinks cold 24 h, hot 12 h. Leak-proof.',
    blurb_long:
      'Double-wall vacuum insulation in 18/8 stainless steel. The powder-coated shell stays grippy when wet and never sweats on your desk.',
    specs: [
      '750 ml • 18/8 food-grade stainless steel',
      'Cold 24 hours / hot 12 hours',
      'Leak-proof lid with carry loop',
      'BPA-free, fits standard cup holders'
    ]
  }
];

/* Coupon codes accepted at checkout. */
const COUPONS = {
  NOVA10: { type: 'percent', value: 10, label: '10% off your order' },
  SAVE20: { type: 'percent', value: 20, label: '20% off your order' },
  FREESHIP: { type: 'shipping', value: 0, label: 'Free shipping applied' }
};

/* Store-wide settings. */
const STORE_CONFIG = {
  currency: 'USD',
  freeShippingThreshold: 100,
  shippingFlat: 9.99,
  taxRate: 0.08
};
