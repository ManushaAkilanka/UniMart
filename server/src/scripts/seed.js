/**
 * Database Seed Script
 * Usage: node src/scripts/seed.js
 *
 * Seeds:
 *  - 6 Core categories
 *  - 1 Admin user
 *  - 3 Verified student sellers
 *  - 30 Realistic campus marketplace listings matching design specs
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';
import { Category, User, Listing } from '../models/index.js';

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    name: 'Academic Gear',
    slug: 'academic-gear',
    description: 'Textbooks, stationery, lab equipment, and study materials',
    icon: 'school',
    sortOrder: 1,
  },
  {
    name: 'Electronics & Laptops',
    slug: 'electronics-laptops',
    description: 'Laptops, tablets, phones, calculators, and tech accessories',
    icon: 'laptop_mac',
    sortOrder: 2,
  },
  {
    name: 'Hostel & Dorm Living',
    slug: 'hostel-dorm-living',
    description: 'Bedding, kitchenware, appliances, and room essentials',
    icon: 'bed',
    sortOrder: 3,
  },
  {
    name: 'Bicycle & Transport',
    slug: 'bicycle-transport',
    description: 'Bicycles, scooters, helmets, and campus transport gear',
    icon: 'directions_bike',
    sortOrder: 4,
  },
  {
    name: 'Uni Merch & Fashion',
    slug: 'uni-merch-fashion',
    description: 'University merchandise, clothing, accessories, and gear',
    icon: 'apparel',
    sortOrder: 5,
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Sports equipment, gym gear, outdoor apparel, and fitness tools',
    icon: 'fitness_center',
    sortOrder: 6,
  },
];

// ── Student Sellers ───────────────────────────────────────────────────────────
const SAMPLE_STUDENTS = [
  {
    fullName: 'Kavindu Senaratne',
    email: 'kavindu.s@sci.cmb.ac.lk',
    faculty: 'Faculty of Science (UOC)',
    campus: 'University of Colombo',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Ruwini Perera',
    email: 'ruwini.p@med.cmb.ac.lk',
    faculty: 'Faculty of Medicine',
    campus: 'University of Colombo',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Dineth Jayasuriya',
    email: 'dineth.j@eng.mrt.ac.lk',
    faculty: 'Faculty of Engineering',
    campus: 'University of Moratuwa',
    role: 'student',
    isVerified: true,
  },
];

// ── 30 Sample Listings Data ──────────────────────────────────────────────────
const LISTINGS_TEMPLATE = [
  // Academic Gear (1 - 8)
  {
    title: 'Casio fx-991EX ClassWiz Scientific Calculator',
    description:
      'High-resolution ClassWiz natural textbook display. Authentic QR code verification present. Essential for engineering and science semester examinations. Battery in great health.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 6800,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle Canteen', 'Main Library Lobby'],
    images: [{ url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800', publicId: 'sample/calc_1' }],
    viewCount: 42,
  },
  {
    title: 'Campbell Biology 11th Edition (Global Edition)',
    description:
      'Standard textbook for Botany, Zoology, and Molecular Biology undergrad modules. Pristine condition with no pencil or highlighter markings on syllabus chapters.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 9500,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['College House Lawn', 'Science Faculty Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', publicId: 'sample/book_campbell' }],
    viewCount: 29,
  },
  {
    title: 'Organic Chemistry by Paula Yurkanis Bruice (8th Edition)',
    description:
      'Comprehensive textbook covering reaction mechanisms, stereochemistry, and synthesis. Includes student study guide and solutions companion booklet.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 7800,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle', 'Reid Avenue Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=800', publicId: 'sample/book_orgchem' }],
    viewCount: 38,
  },
  {
    title: 'Rotring Technical Drawing Pen Set & Architect Scale Ruler',
    description:
      'Complete set with 0.2mm, 0.4mm, and 0.8mm pens plus original Rotring capillary ink bottle. Used for 1st-year engineering graphics and architecture coursework.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 5200,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Civil Engineering Lobby', 'Campus Ground Pavilion'],
    images: [{ url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800', publicId: 'sample/rotring_set' }],
    viewCount: 19,
  },
  {
    title: 'Robbins & Cotran Pathologic Basis of Disease (10th Ed)',
    description:
      'Hardcover international student edition. Gold standard textbook for medical pathology modules. Free of dog-ears, clean spine.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 14000,
    priceMode: 'fixed',
    condition: 'new',
    campus: 'University of Colombo',
    meetupSpots: ['Faculty of Medicine Kynsey Road Entrance', 'Med Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', publicId: 'sample/robbins_path' }],
    viewCount: 47,
  },
  {
    title: 'Standard White Laboratory Coat (Size M) - 100% Cotton',
    description:
      'Prescribed knee-length lab coat with deep front pockets and secure snap buttons. Freshly laundered and pressed. Mandatory for all chemistry and bio labs.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 2400,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Chemistry Department Porch', 'Science Quadrangle'],
    images: [{ url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800', publicId: 'sample/lab_coat' }],
    viewCount: 15,
  },
  {
    title: 'Calculus & Linear Algebra Complete Lecture Notes & Past Papers',
    description:
      'Complete printed and bound handwritten lecture notes covering 1st and 2nd semester Pure Math modules with worked tutorial problems and past 5 years model solutions.',
    catSlug: 'academic-gear',
    listingType: 'free',
    price: 0,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Main Library Entrance', 'Maths Dept Corridor'],
    images: [{ url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800', publicId: 'sample/math_notes' }],
    viewCount: 65,
  },
  {
    title: 'Casio fx-570ES Plus 2nd Edition Non-Programmable Calculator',
    description:
      'Approved non-programmable calculator for university term examinations. Matrix, vector, complex number, and statistics functions.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 4500,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Engineering Canteen', 'Library Common Area'],
    images: [{ url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800', publicId: 'sample/calc_570' }],
    viewCount: 22,
  },

  // Electronics & Laptops (9 - 16)
  {
    title: 'Dell UltraSharp 24" IPS Monitor (FHD, HDMI/DisplayPort, Pivot)',
    description:
      '99% sRGB color accurate display with fully adjustable height, tilt, and 90-degree pivot stand for reading documentation and coding. Zero dead pixels.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 36000,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['UCSC Lobby', 'Reid Avenue Student Center'],
    images: [{ url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800', publicId: 'sample/dell_monitor' }],
    viewCount: 88,
  },
  {
    title: 'Logitech MX Master 2S Wireless Bluetooth Mouse (Graphite)',
    description:
      'Ergonomic mouse with hyper-fast scroll wheel and gesture control. Connects up to 3 devices simultaneously. Battery lasts 2 months on single charge.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 14500,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Sentura Canteen', 'Electrical Dept Lobby'],
    images: [{ url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800', publicId: 'sample/logitech_mouse' }],
    viewCount: 54,
  },
  {
    title: 'Apple iPad 9th Gen (64GB WiFi, Space Gray) + Apple Pencil 1',
    description:
      'Perfect student tablet for GoodNotes / Notability paperless lecture note taking. Includes original Apple Pencil, tempered glass installed, and protective magnetic folio case.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 78000,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['College House Entrance', 'Main Library Lobby'],
    images: [{ url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800', publicId: 'sample/ipad_pencil' }],
    viewCount: 112,
  },
  {
    title: 'Sony WH-1000XM4 Wireless Active Noise Cancelling Headphones',
    description:
      'Industry-leading active noise cancellation. Crucial for deep study sessions in noisy dorms or crowded libraries. Comes with original carrying case and audio cable.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 52000,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle', 'UCSC Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', publicId: 'sample/sony_headphones' }],
    viewCount: 76,
  },
  {
    title: 'Keychron K2 Wireless Mechanical Keyboard (Gateron Brown)',
    description:
      '75% compact wireless/wired mechanical keyboard with Mac & Windows layout keycaps. Tactile quiet brown switches suitable for library use.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 18500,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Moratuwa',
    meetupSpots: ['Mechanical Workshop Gate', 'Library Lounge'],
    images: [{ url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', publicId: 'sample/keychron_k2' }],
    viewCount: 49,
  },
  {
    title: 'Lenovo ThinkPad T480 (Core i5 8th Gen, 16GB RAM, 512GB SSD)',
    description:
      'Legendary durable ThinkPad build quality with dual batteries (hot-swappable). Upgraded to 16GB dual-channel RAM and speedy NVMe SSD. Linux/Ubuntu ready.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 85000,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Computer Science Dept', 'Campus Center'],
    images: [{ url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800', publicId: 'sample/thinkpad_t480' }],
    viewCount: 140,
  },
  {
    title: 'Anker 65W GaN USB-C Dual Port Fast Charger & Braided Cable',
    description:
      'Compact high-speed GaN charger capable of powering MacBooks, ThinkPads, and phones simultaneously. Includes durable 2-meter 100W PD braided cable.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 7500,
    priceMode: 'fixed',
    condition: 'new',
    campus: 'University of Colombo',
    meetupSpots: ['Science Faculty Gate', 'Reid Avenue Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800', publicId: 'sample/anker_charger' }],
    viewCount: 31,
  },
  {
    title: 'Baseus 7-in-1 Aluminum USB-C Hub (4K HDMI, SD Reader, 100W PD)',
    description:
      'Essential adapter dongle for modern slim laptops without legacy ports. 3x USB 3.0, 4K 30Hz HDMI for projector presentations in lecture halls.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 5800,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['UCSC Study Room', 'Library Lawn'],
    images: [{ url: 'https://images.unsplash.com/photo-1622445262464-84b1456045b6?w=800', publicId: 'sample/usbc_hub' }],
    viewCount: 26,
  },

  // Hostel & Dorm Living (17 - 22)
  {
    title: 'Bajaj 3-Blade Oscillating Desk Fan for Dorm Room',
    description:
      'Silent operation 3-speed desk fan with wide oscillation angle. Compact footprint, low electricity consumption, keeping study rooms cool during warm dry spells.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 6500,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Bloomfield Hall Gate', 'College House'],
    images: [{ url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800', publicId: 'sample/desk_fan' }],
    viewCount: 37,
  },
  {
    title: 'Panasonic Automatic Electric Rice Cooker (1.0L with Steam Tray)',
    description:
      'Non-stick inner pan with automatic keep-warm function. Compact 1-liter capacity ideal for 1 to 2 hostel roommates cooking rice and steamed vegetables.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 7200,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Hostel Complex Gate', 'Main Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=800', publicId: 'sample/rice_cooker' }],
    viewCount: 45,
  },
  {
    title: 'Foldable Wooden Study Table & Ergonomic Metal Chair',
    description:
      'Space-saving foldable study desk with water-resistant walnut laminate surface. Sturdy powder-coated metal frame fits easily in shared hostel quarters.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 8900,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Hostel Quadrangle', 'Reid Avenue Sports Complex'],
    images: [{ url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800', publicId: 'sample/study_desk' }],
    viewCount: 52,
  },
  {
    title: 'Rechargeable LED Desk Study Lamp with 3 Color Temperatures',
    description:
      'Built-in 2000mAh battery providing up to 8 hours of soft flicker-free light during unexpected power cuts. Touch dimmer control and flexible gooseneck.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 3200,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Main Library Entrance', 'Science Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800', publicId: 'sample/desk_lamp' }],
    viewCount: 61,
  },
  {
    title: 'Single Bed Heavy Cotton Mattress & 2x Pillow Covers',
    description:
      'Standard 3x6 ft high-density foam hostel mattress with washable zip cover. Sanitized and wrapped in protective plastic sheet. Ready for immediate pickup.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 6000,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Hostel B Block Security Desk'],
    images: [{ url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', publicId: 'sample/mattress' }],
    viewCount: 18,
  },
  {
    title: 'Pigeon Induction Cooker (2000W) with Stainless Steel Cooking Pot',
    description:
      'Energy efficient countertop induction cooktop with digital display and pre-set Indian/Sri Lankan cooking menus. Safe flame-less dorm cooking.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 9500,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['College House Back Gate', 'Science Faculty'],
    images: [{ url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800', publicId: 'sample/induction_cooker' }],
    viewCount: 39,
  },

  // Bicycle & Transport (23 - 26)
  {
    title: 'Lumala 26" Campus Commuter Mountain Bicycle (21-Speed)',
    description:
      'Dependable aluminum alloy frame with front suspension and Shimano 21-speed thumb shifters. Serviced last month with fresh brake pads and lubricated chain.',
    catSlug: 'bicycle-transport',
    listingType: 'sale',
    price: 24500,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Mechanical Engineering Porch', 'Campus Main Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800', publicId: 'sample/lumala_bike' }],
    viewCount: 95,
  },
  {
    title: 'DSI Single-Speed Classic City Bicycle with Front Wire Basket',
    description:
      'Simple, low-maintenance town bicycle perfect for quick commutes between Reid Avenue lectures and Independence Square / Thimbirigasyaya boarding rooms.',
    catSlug: 'bicycle-transport',
    listingType: 'sale',
    price: 16000,
    priceMode: 'fixed',
    condition: 'used-fair',
    campus: 'University of Colombo',
    meetupSpots: ['College House Entrance', 'Race Course Car Park'],
    images: [{ url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800', publicId: 'sample/city_bike' }],
    viewCount: 41,
  },
  {
    title: 'Giyo High-Pressure Floor Bicycle Pump with Pressure Gauge',
    description:
      'Dual valve head compatible with both Presta and Schrader bicycle and scooter valves. Accurate analog gauge up to 160 PSI.',
    catSlug: 'bicycle-transport',
    listingType: 'sale',
    price: 3400,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Moratuwa',
    meetupSpots: ['Engineering Ground Pavilion'],
    images: [{ url: 'https://images.unsplash.com/photo-1559348349-86f1f65817fe?w=800', publicId: 'sample/bike_pump' }],
    viewCount: 14,
  },
  {
    title: 'Kryptonite Heavy-Duty Steel U-Lock with 2 Security Keys',
    description:
      'Hardened 13mm performance steel shackle resists bolt cutters and leverage attacks. Includes frame mount bracket for bicycle security around campus bike racks.',
    catSlug: 'bicycle-transport',
    listingType: 'sale',
    price: 5500,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle Bicycle Shed'],
    images: [{ url: 'https://images.unsplash.com/photo-1549492423-400259a2e574?w=800', publicId: 'sample/u_lock' }],
    viewCount: 27,
  },

  // Uni Merch & Fashion (27 - 29)
  {
    title: 'Official University of Colombo Science Faculty Hoodie (Navy / M)',
    description:
      'Heavyweight 320 GSM brushed fleece university hoodie featuring embroidered UOC faculty seal. Kept in pristine condition, no fading or frayed cuffs.',
    catSlug: 'uni-merch-fashion',
    listingType: 'sale',
    price: 4200,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle', 'Reid Avenue Pavilion'],
    images: [{ url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800', publicId: 'sample/uoc_hoodie' }],
    viewCount: 78,
  },
  {
    title: 'UOM Engineering Annual Cricket Championship Jersey (Brand New)',
    description:
      'Limited edition technical dry-fit sports tee from the annual inter-faculty sports gala. Unworn with tags attached. Size L.',
    catSlug: 'uni-merch-fashion',
    listingType: 'sale',
    price: 2500,
    priceMode: 'fixed',
    condition: 'new',
    campus: 'University of Moratuwa',
    meetupSpots: ['Gymnasium Lobby', 'Civil Engineering Dept'],
    images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', publicId: 'sample/uom_jersey' }],
    viewCount: 33,
  },
  {
    title: 'Jansport SuperBreak Campus Backpack (Deep Forest Green)',
    description:
      'Classic 26L student daypack with padded straight-cut shoulder straps and front utility organizer pocket. Fits 15-inch laptop and three heavy reference books.',
    catSlug: 'uni-merch-fashion',
    listingType: 'sale',
    price: 5800,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Main Library Steps', 'College House'],
    images: [{ url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', publicId: 'sample/jansport_bag' }],
    viewCount: 56,
  },

  // Sports & Fitness (30)
  {
    title: 'Yonex Nanoray 10F Badminton Racket with Cover & 3 Shuttles',
    description:
      'Lightweight isometric head racket for swift counter-attacks and defense. Freshly restrung at 24 lbs with BG65 string. Perfect for campus gymnasium practice.',
    catSlug: 'sports-fitness',
    listingType: 'sale',
    price: 8500,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Indoor Gymnasium Court', 'Reid Avenue Pavilion'],
    images: [{ url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800', publicId: 'sample/yonex_racket' }],
    viewCount: 64,
  },
];

async function seed() {
  console.log('[Seed] Connecting to database…');
  await mongoose.connect(ENV.MONGO_URI);
  console.log('[Seed] Database connected.');

  // 1. Seed Categories
  console.log('\n[Seed] 📁 Upserting categories…');
  const categoryMap = new Map();
  for (const cat of CATEGORIES) {
    const doc = await Category.findOneAndUpdate({ slug: cat.slug }, cat, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    categoryMap.set(doc.slug, doc._id);
    console.log(`  ✅ ${doc.name} (${doc.slug})`);
  }

  // 2. Seed Admin User
  console.log('\n[Seed] 👑 Upserting admin user…');
  const adminHash = await bcrypt.hash(ENV.ADMIN_PASSWORD, 12);
  const admin = await User.findOneAndUpdate(
    { email: ENV.ADMIN_EMAIL.toLowerCase() },
    {
      fullName: ENV.ADMIN_FULL_NAME,
      email: ENV.ADMIN_EMAIL.toLowerCase(),
      passwordHash: adminHash,
      role: 'admin',
      isVerified: true,
      isSuspended: false,
      campus: 'University of Colombo',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`  ✅ Admin: ${admin.fullName} <${admin.email}>`);

  // 3. Seed Student Sellers
  console.log('\n[Seed] 🎓 Upserting student sellers…');
  const studentIds = [];
  const defaultPasswordHash = await bcrypt.hash('Password123!', 12);

  for (const stu of SAMPLE_STUDENTS) {
    const student = await User.findOneAndUpdate(
      { email: stu.email.toLowerCase() },
      {
        ...stu,
        passwordHash: defaultPasswordHash,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    studentIds.push(student._id);
    console.log(`  ✅ Student: ${student.fullName} (${student.campus})`);
  }

  // 4. Seed 30 Sample Listings
  console.log('\n[Seed] 📦 Seeding 30 sample listings…');
  let count = 0;
  for (let i = 0; i < LISTINGS_TEMPLATE.length; i++) {
    const item = LISTINGS_TEMPLATE[i];
    const categoryId = categoryMap.get(item.catSlug);
    const sellerId = studentIds[i % studentIds.length];

    const listingData = {
      title: item.title,
      description: item.description,
      categoryId,
      sellerId,
      listingType: item.listingType,
      price: item.price,
      priceMode: item.priceMode,
      currency: 'LKR',
      condition: item.condition,
      campus: item.campus,
      meetupSpots: item.meetupSpots,
      images: item.images,
      status: 'active',
      viewCount: item.viewCount,
    };

    await Listing.findOneAndUpdate({ title: item.title }, listingData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    count++;
    console.log(`  [${count}/30] ✅ ${item.title.substring(0, 48)}… (Rs. ${item.price})`);
  }

  console.log(`\n[Seed] 🎉 Successfully seeded ${count} listings, 6 categories, and 4 users.\n`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] ❌ Fatal error:', err);
  process.exit(1);
});
