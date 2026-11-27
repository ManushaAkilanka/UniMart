import { Category } from '../models/index.js';

export const CATEGORY_CATALOG = [
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
  {
    name: 'Medical & Healthcare',
    slug: 'medical-healthcare',
    description:
      'Stethoscopes, scrubs, lab coats, first-aid kits, and non-prescription care equipment; no medicines',
    icon: 'medical_services',
    sortOrder: 7,
  },
  {
    name: 'Lab & Engineering Equipment',
    slug: 'lab-engineering-equipment',
    description: 'Lab tools, safety gear, measuring instruments, and engineering kits',
    icon: 'precision_manufacturing',
    sortOrder: 8,
  },
  {
    name: 'Arts & Design Supplies',
    slug: 'arts-design-supplies',
    description: 'Drawing, painting, drafting, craft, and studio materials',
    icon: 'palette',
    sortOrder: 9,
  },
  {
    name: 'Music & Audio Gear',
    slug: 'music-audio-gear',
    description: 'Musical instruments, microphones, headphones, and practice equipment',
    icon: 'music_note',
    sortOrder: 10,
  },
];

export async function ensureDefaultCategories() {
  for (const category of CATEGORY_CATALOG) {
    await Category.updateOne(
      { slug: category.slug },
      { $setOnInsert: category },
      { upsert: true }
    );
  }
}
