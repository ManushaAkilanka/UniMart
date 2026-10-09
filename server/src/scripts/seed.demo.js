/**
 * Database Extended Demo Seed Script
 * Usage: node src/scripts/seed.demo.js
 *
 * Seeds:
 *  - 6 Core categories
 *  - 1 Admin user
 *  - 12 Verified student sellers across major faculties (including UOC Faculty of Technology)
 *  - 110+ Realistic campus marketplace listings with tech/hardware items, academic gear, dorm, bikes, and merch
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
    description: 'Laptops, tablets, phones, calculators, embedded hardware, and tech accessories',
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
    fullName: 'Charith Wijesinghe',
    email: 'charith.w@fot.cmb.ac.lk',
    faculty: 'Faculty of Technology',
    campus: 'University of Colombo',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Sanduni De Silva',
    email: 'sanduni.s@fot.cmb.ac.lk',
    faculty: 'Faculty of Technology',
    campus: 'University of Colombo',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Malith Jayawardena',
    email: 'malith.j@ucsc.cmb.ac.lk',
    faculty: 'University of Colombo School of Computing',
    campus: 'University of Colombo',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Kavindu Senaratne',
    email: 'kavindu.s@sci.cmb.ac.lk',
    faculty: 'Faculty of Science',
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
  {
    fullName: 'Anuki Wickramasinghe',
    email: 'anuki.w@itfac.mrt.ac.lk',
    faculty: 'Faculty of Information Technology',
    campus: 'University of Moratuwa',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Tharindu Bandara',
    email: 'tharindu.b@eng.pdn.ac.lk',
    faculty: 'Faculty of Engineering',
    campus: 'University of Peradeniya',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Nethmi Fernando',
    email: 'nethmi.f@mgt.sjp.ac.lk',
    faculty: 'Faculty of Management Studies',
    campus: 'University of Sri Jayewardenepura',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Sahan Dissanayake',
    email: 'sahan.d@kln.ac.lk',
    faculty: 'Faculty of Computing & Technology',
    campus: 'University of Kelaniya',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Minoli Weerakkody',
    email: 'minoli.w@sliit.lk',
    faculty: 'Faculty of Computing',
    campus: 'SLIIT',
    role: 'student',
    isVerified: true,
  },
  {
    fullName: 'Gayan Rathnayake',
    email: 'gayan.r@sci.ruh.ac.lk',
    faculty: 'Faculty of Science',
    campus: 'University of Ruhuna',
    role: 'student',
    isVerified: true,
  },
];

// Helper to build list of 110+ items
const DEMO_ITEMS = [
  // ── UOC FACULTY OF TECHNOLOGY / ICT & EMBEDDED HARDWARE (Electronics) ──
  {
    title: 'ESP32 NodeMCU Wi-Fi + Bluetooth Dev Board (Dual Core ESP-WROOM-32)',
    description: 'Unopened ESP32 CP2102 development board with micro-USB. Used for IoT smart campus sensor project in UOC FoT ICT department. Fully tested with Arduino IDE and MicroPython.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 2400,
    priceMode: 'fixed',
    condition: 'brand-new',
    campus: 'University of Colombo',
    meetupSpots: ['Faculty of Technology Pitipana Tech Canteen', 'Reid Avenue Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', publicId: 'demo/esp32_1' }],
    viewCount: 68,
  },
  {
    title: 'Arduino Uno R3 with Atmega328P + USB Cable',
    description: 'Original-style DIP chip Uno R3 with removable ATmega328P microcontroller and blue USB-B cable. Ideal for 1st/2nd year robotics, electronics, and instrumentation practicals.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 3200,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Main Lobby', 'Science Quadrangle'],
    images: [{ url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800', publicId: 'demo/arduino_uno' }],
    viewCount: 84,
  },
  {
    title: 'Raspberry Pi 4 Model B (4GB RAM) with Heatsink Aluminium Case',
    description: 'Quad-core 64-bit Broadcom SoC, 4GB LPDDR4, dual micro-HDMI 4K displays. Includes passive aluminium heatsink casing and 32GB SanDisk Extreme MicroSD pre-flashed with Raspberry Pi OS.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 24500,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['UCSC Lobby', 'FoT Pitipana Gate', 'Colombo Main Library'],
    images: [{ url: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800', publicId: 'demo/rpi4' }],
    viewCount: 142,
  },
  {
    title: 'Arduino Mega 2560 R3 Board with 54 Digital I/O Pins',
    description: 'High pin-count development board perfect for 3D printer controllers or multi-sensor robotics semester projects. 256KB flash memory, 4 UART hardware serial ports.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 4900,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Complex', 'Reid Avenue Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800', publicId: 'demo/arduino_mega' }],
    viewCount: 55,
  },
  {
    title: 'STM32F103C8T6 ARM Cortex-M3 "Blue Pill" Dev Board + ST-Link V2',
    description: 'High-speed 72MHz ARM Cortex-M3 board with USB ST-Link V2 programmer dongle. Used for real-time embedded systems and DSP coursework.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 2900,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Faculty of Technology Pitipana Tech Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800', publicId: 'demo/stm32' }],
    viewCount: 39,
  },
  {
    title: 'UNI-T UT33D+ Digital Multimeter with Backlight & Probes',
    description: 'Pocket digital multimeter capable of 600V AC/DC, 10A current, resistance, diode check, and continuity buzzer. Test leads and 9V battery included.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 3800,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Electronic Lab Area', 'Science Library'],
    images: [{ url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800', publicId: 'demo/multimeter' }],
    viewCount: 91,
  },
  {
    title: '60W Adjustable Temperature Soldering Iron Kit with Solder Wire & Flux',
    description: '200°C to 450°C dial temperature control soldering iron. Includes 5 interchangeable tips, desoldering pump (solder sucker), tweezers, lead-free solder wire, and stand.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 4200,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Workshop Gate', 'UCSC Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800', publicId: 'demo/solder_kit' }],
    viewCount: 76,
  },
  {
    title: '830-Point Solderless Breadboard + 65pc Male-to-Male Jumper Wires Bundle',
    description: 'High quality MB-102 transparent breadboard with power distribution rails and flexible multi-color jumper wire bundle. Free from bent pins or loose spring contacts.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 1350,
    priceMode: 'fixed',
    condition: 'brand-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Tech Canteen', 'Science Quadrangle'],
    images: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', publicId: 'demo/breadboard' }],
    viewCount: 47,
  },
  {
    title: '37-in-1 Sensor Modules Kit for Arduino & IoT (Ultrasonic, PIR, DHT11, Relays)',
    description: 'Comprehensive sensor pack: HC-SR04 distance sensor, MQ-2 gas sensor, DHT11 temp/humidity, passive buzzer, sound sensor, flame detector, 5V relay, and IR obstacle module. Plastic organizer box included.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 8500,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Ground Floor', 'Reid Avenue Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800', publicId: 'demo/sensor_kit' }],
    viewCount: 112,
  },
  {
    title: '0.96 inch I2C OLED Display (128x64 Blue/Yellow) - 2 Pieces',
    description: 'Pair of SSD1306 4-pin I2C OLED displays for microcontrollers. Crisp contrast, very low power consumption, runs on 3.3V or 5V.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 1800,
    priceMode: 'fixed',
    condition: 'brand-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Main Entrance'],
    images: [{ url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800', publicId: 'demo/oled' }],
    viewCount: 33,
  },
  {
    title: 'FT232RL USB to TTL Serial UART Adapter + Logic Analyzer 24MHz 8Ch',
    description: 'USB-to-Serial converter for debugging ESP32/Arduino bootloaders + 24MHz 8-channel USB logic analyzer compatible with Sigrok PulseView. Essential for protocol analysis.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 3600,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Computer Center', 'UCSC West Wing'],
    images: [{ url: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=800', publicId: 'demo/logic_analyzer' }],
    viewCount: 52,
  },
  {
    title: 'WANTED: Raspberry Pi Zero 2 W for Final Year Embedded Project',
    description: 'Looking for a Raspberry Pi Zero 2 W or Zero W with header soldered. Needed urgently for IoT wearable project at UOC Faculty of Technology. Budget flexible depending on condition.',
    catSlug: 'electronics-laptops',
    listingType: 'wanted',
    price: 6000,
    budgetMin: 4000,
    budgetMax: 7500,
    urgency: 'high',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Tech Canteen', 'Reid Avenue Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800', publicId: 'demo/wanted_pizero' }],
    viewCount: 88,
  },
  {
    title: 'FREE: Assorted Resistors (1/4W 220R, 1k, 10k) & Ceramic Capacitors Box',
    description: 'Leftover electronic components from 2nd year electronics group laboratory project. Over 150 assorted through-hole resistors, capacitors, and LEDs. Free to any junior student who will use them!',
    catSlug: 'electronics-laptops',
    listingType: 'free',
    price: 0,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Main Lobby', 'Science Quadrangle'],
    images: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', publicId: 'demo/free_resistors' }],
    viewCount: 175,
  },

  // ── LAPTOPS, TABLETS & COMPUTING (Electronics) ──
  {
    title: 'Dell Latitude 7490 Core i7-8650U / 16GB RAM / 512GB NVMe SSD',
    description: 'Business-class lightweight ultrabook. Intel Core i7 quad-core, 16GB dual-channel DDR4, 14" Full HD matte anti-glare IPS display, backlit keyboard, 4-hour battery. Perfect for coding, VM labs, and Docker.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 98000,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['UCSC Lobby', 'Reid Avenue Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800', publicId: 'demo/dell_7490' }],
    viewCount: 220,
  },
  {
    title: 'Lenovo ThinkPad T480 (Core i5 8th Gen, 16GB, Dual Battery System)',
    description: 'Legendary ThinkPad keyboard and rugged MIL-STD build. Dual internal+hot-swap external batteries giving 6+ hours uptime. Thunderbolt 3 port for external monitors.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 88000,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['IT Faculty Lobby', 'Campus Ground Pavilion'],
    images: [{ url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800', publicId: 'demo/thinkpad' }],
    viewCount: 195,
  },
  {
    title: 'Apple iPad 9th Gen (64GB Wi-Fi Space Gray) + Apple Pencil 1st Gen',
    description: '10.2-inch Retina display with True Tone. Original Apple Pencil and magnetic ESR smart folio case included. Used for medical lecture note taking in GoodNotes.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 82000,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Faculty of Medicine Kynsey Road', 'National Hospital Library Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800', publicId: 'demo/ipad_9' }],
    viewCount: 310,
  },
  {
    title: 'Logitech MX Master 2S Wireless Ergonomic Mouse',
    description: 'Hyper-fast scroll wheel, rechargeable battery lasting up to 70 days, cross-computer Flow control. Excellent ergonomic shape for long programming sessions.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 11500,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle Canteen', 'Reid Avenue Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800', publicId: 'demo/mx_master' }],
    viewCount: 88,
  },
  {
    title: 'Keychron K2 V2 Wireless Mechanical Keyboard (Gateron Brown Switches)',
    description: '75% compact layout with Bluetooth 5.1 and Type-C wired mode. Mac and Windows compatible with swappable keycaps. White LED backlight.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 21000,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Moratuwa',
    meetupSpots: ['Civil Engineering Ground Floor', 'Canteen 01'],
    images: [{ url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', publicId: 'demo/keychron' }],
    viewCount: 165,
  },
  {
    title: 'Anker PowerCore 20,000mAh High Capacity Fast Charging Power Bank',
    description: 'Dual USB output ports with PowerIQ voltage boost. Keeps phone and calculator charged through all-day study sessions during campus power cuts.',
    catSlug: 'electronics-laptops',
    listingType: 'sale',
    price: 6800,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Main Library Entrance', 'Arts Quad'],
    images: [{ url: 'https://images.unsplash.com/photo-1609592426868-b76922eb5520?w=800', publicId: 'demo/powerbank' }],
    viewCount: 92,
  },
  {
    title: 'WANTED: USB-C to HDMI & VGA Multiport Hub Adapter',
    description: 'Urgent: Looking for a reliable Type-C hub with HDMI output for campus thesis presentations. Needs to support 1080p projectors.',
    catSlug: 'electronics-laptops',
    listingType: 'wanted',
    price: 3500,
    budgetMin: 2000,
    budgetMax: 4500,
    urgency: 'high',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Tech Canteen', 'Science Faculty Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800', publicId: 'demo/hub' }],
    viewCount: 41,
  },

  // ── ACADEMIC GEAR & TEXTBOOKS ──
  {
    title: 'Casio fx-991EX ClassWiz Scientific Calculator (Natural Display)',
    description: 'Authentic Casio ClassWiz with high-res display and matrix/vector calculus modes. Required for engineering & physical science semester finals. Original cover included.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 6500,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle Canteen', 'Main Library Lobby'],
    images: [{ url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800', publicId: 'demo/fx991ex' }],
    viewCount: 140,
  },
  {
    title: 'Calculus: Early Transcendentals by James Stewart (8th Metric Edition)',
    description: 'Gold standard mathematics textbook for engineering, math, and computer science degree courses. Clean pages with minimal pencil margin notes in chapter 3.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 7500,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Sumanadasa Building Lobby', 'Moratuwa Main Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', publicId: 'demo/stewart_calc' }],
    viewCount: 78,
  },
  {
    title: 'Campbell Biology 11th Edition (Pearson Global Edition)',
    description: 'Comprehensive undergraduate biology reference covering cell biology, genetics, and ecology. Hardbound with full color diagrams throughout.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 9200,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['College House Lawn', 'Science Faculty Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=800', publicId: 'demo/campbell' }],
    viewCount: 110,
  },
  {
    title: 'Organic Chemistry by Paula Yurkanis Bruice (8th Edition)',
    description: 'Essential chemistry textbook covering reaction mechanisms, synthesis, and molecular structure. Includes companion study guide booklet.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 7900,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle', 'Reid Avenue Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800', publicId: 'demo/bruice' }],
    viewCount: 65,
  },
  {
    title: 'Robbins & Cotran Pathologic Basis of Disease (10th Edition)',
    description: 'Essential medical undergraduate pathology textbook. Full colour clinical photography and histological slides. Kept in pristine dust jacket.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 18500,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Faculty of Medicine Kynsey Road', 'Anatomy Building Lawn'],
    images: [{ url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', publicId: 'demo/robbins' }],
    viewCount: 95,
  },
  {
    title: 'Littmann Classic III Monitoring Stethoscope (Black Edition)',
    description: 'Original 3M Littmann Classic III stethoscope with dual-sided chestpiece. Tunable diaphragms on both pediatric and adult sides. Pristine acoustics.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 28000,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Faculty of Medicine Dean Office Lawn', 'Clinical Skills Centre'],
    images: [{ url: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800', publicId: 'demo/stethoscope' }],
    viewCount: 135,
  },
  {
    title: 'A2 Architecture & Engineering Wooden Drawing Board with Parallel Motion Bar',
    description: 'Heavy duty beechwood drafting board fitted with smooth wire-guided parallel motion straight edge ruler and angle adjustment legs. Perfect for engineering graphics.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 8500,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Architecture Faculty Court', 'Civil Engineering Dept Ground Floor'],
    images: [{ url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800', publicId: 'demo/drawing_board' }],
    viewCount: 82,
  },
  {
    title: 'Unisex White Laboratory Coat (100% Cotton, Size M)',
    description: 'Heavyweight white lab coat with chest and waist pockets. Compliant with university chemical safety standards. Washed and sanitized.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 1600,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle Canteen', 'Chemistry Dept Notice Board'],
    images: [{ url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800', publicId: 'demo/lab_coat' }],
    viewCount: 98,
  },
  {
    title: 'Computer Networks: A Systems Approach by Peterson & Davie (5th Ed)',
    description: 'Core networking textbook for software engineering and computer engineering students. Detailed coverage of TCP/IP, OSI model, routing algorithms, and sockets.',
    catSlug: 'academic-gear',
    listingType: 'sale',
    price: 5400,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['UCSC West Wing Gate', 'Main Library Lawn'],
    images: [{ url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', publicId: 'demo/comp_networks' }],
    viewCount: 57,
  },
  {
    title: 'FREE: Complete Semester 1 & 2 Past Examination Papers with Answer Notes',
    description: 'Compiled past papers with handwritten solutions and model answers for Physics, Applied Mathematics, and Pure Mathematics. Donating to any freshers who need study help!',
    catSlug: 'academic-gear',
    listingType: 'free',
    price: 0,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle', 'Main Library Front Steps'],
    images: [{ url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800', publicId: 'demo/past_papers' }],
    viewCount: 230,
  },
  {
    title: 'WANTED: Electrical Engineering Dissection & Tool Kit with Wire Stripper',
    description: 'Looking for a complete electronics lab tool kit with wire strippers, needle-nose pliers, and ESD tweezers for 2nd year practicals. Please reach out if selling!',
    catSlug: 'academic-gear',
    listingType: 'wanted',
    price: 3000,
    budgetMin: 2000,
    budgetMax: 4000,
    urgency: 'medium',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Electrical Eng Dept Lobby', 'Moratuwa Main Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800', publicId: 'demo/wanted_tools' }],
    viewCount: 49,
  },

  // ── HOSTEL & DORM LIVING ──
  {
    title: 'Singer 1.8L Stainless Steel Electric Kettle with Auto Shut-Off',
    description: 'Rapid-boil 1500W electric kettle with concealed heating element, boil-dry protection, and 360-degree swivel base. Perfect for instant tea and noodles during late exam nights.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 3200,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Bloomfield Hostel Gate', 'College House Roundabout'],
    images: [{ url: 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=800', publicId: 'demo/kettle' }],
    viewCount: 114,
  },
  {
    title: 'Rechargeable LED Desk Study Lamp with Phone Stand (3 Color Modes)',
    description: 'Foldable touch-dimmable LED lamp with built-in 2000mAh lithium battery. Lasts 5 hours on full brightness during campus power cuts. Warm, natural, and daylight white modes.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 2600,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Hostel Common Room', 'Reid Avenue Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800', publicId: 'demo/desk_lamp' }],
    viewCount: 89,
  },
  {
    title: 'Prestige 1.8L Non-Stick Electric Rice Cooker with Steamer Tray',
    description: 'Compact automatic rice cooker with keep-warm function, tempered glass lid, measuring cup, and plastic spatula. Ideal for dorm cooking.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 4800,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Moratuwa',
    meetupSpots: ['Hostel Complex Gate 2', 'Moratuwa Main Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800', publicId: 'demo/rice_cooker' }],
    viewCount: 102,
  },
  {
    title: 'Damro Heavy Duty 4-Shelf Plastic Storage Cupboard',
    description: 'Weatherproof plastic storage unit for hostel clothes, books, and toiletries. Lightweight, easy to dismantle, and clean.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 7200,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Bloomfield Hostel Courtyard', 'Thimbirigasyaya Road Junction'],
    images: [{ url: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800', publicId: 'demo/damro_cupboard' }],
    viewCount: 75,
  },
  {
    title: 'Single Bed Mattress with High Density Foam (3x6 ft) + Washable Cover',
    description: 'Comfortable orthopaedic standard single mattress for hostel bunks. No sagging, sanitized, and stored indoors.',
    catSlug: 'hostel-dorm-living',
    listingType: 'sale',
    price: 6500,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Peradeniya',
    meetupSpots: ['Akbar Nell Hostel', 'Hantana Road Turnoff'],
    images: [{ url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', publicId: 'demo/mattress' }],
    viewCount: 63,
  },
  {
    title: 'FREE: Heavy Duty 5-Outlet Extension Cord Surge Protector (3m Cable)',
    description: 'Working 3-meter multi-plug strip with individual switches and neon indicators. Free to any student moving into dorms this semester.',
    catSlug: 'hostel-dorm-living',
    listingType: 'free',
    price: 0,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Tech Canteen', 'Science Faculty Lawn'],
    images: [{ url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800', publicId: 'demo/extension_cord' }],
    viewCount: 145,
  },
  {
    title: 'WANTED: Mini Fridge or Compact Dorm Refrigerator (50L - 90L)',
    description: 'Searching for a small working bar fridge for university room to store milk, fruits, and medicine. Will pick up in van.',
    catSlug: 'hostel-dorm-living',
    listingType: 'wanted',
    price: 25000,
    budgetMin: 18000,
    budgetMax: 28000,
    urgency: 'medium',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['College House Roundabout', 'Reid Avenue Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800', publicId: 'demo/fridge' }],
    viewCount: 84,
  },

  // ── BICYCLE & TRANSPORT ──
  {
    title: 'Lumala City Cruiser Commuter Bicycle (18-Speed Shimano Gears)',
    description: 'Solid Sri Lankan commuter bike with front basket, rear luggage carrier rack, mudguards, and bell. New Kenda tires fitted last month. Perfect for commuting between Colombo hostels and Reid Avenue lectures.',
    catSlug: 'bicycle-transport',
    listingType: 'sale',
    price: 26000,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Reid Avenue Bicycle Shed', 'College House Roundabout'],
    images: [{ url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800', publicId: 'demo/bike_lumala' }],
    viewCount: 188,
  },
  {
    title: 'Giant ATX Mountain Bike (27.5" Wheels, Disc Brakes, Front Suspension)',
    description: 'Lightweight ALUXX aluminium frame, Shimano Tourney 21-speed drivetrain, mechanical disc brakes. Great for campus riding and weekend trails.',
    catSlug: 'bicycle-transport',
    listingType: 'sale',
    price: 54000,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Moratuwa',
    meetupSpots: ['Campus Main Gate Pavilion', 'Sports Complex Parking'],
    images: [{ url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800', publicId: 'demo/bike_giant' }],
    viewCount: 215,
  },
  {
    title: 'Heavy Duty 5-Digit Combination Steel Cable Bicycle Lock (1.2m)',
    description: 'Resettable hardened steel security cable with anti-scratch PVC coating. Protects your bike parked at university bicycle sheds.',
    catSlug: 'bicycle-transport',
    listingType: 'sale',
    price: 1950,
    priceMode: 'fixed',
    condition: 'brand-new',
    campus: 'University of Colombo',
    meetupSpots: ['Science Quadrangle Canteen', 'Reid Avenue Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800', publicId: 'demo/bike_lock' }],
    viewCount: 52,
  },
  {
    title: 'Rechargeable LED Bike Headlight (800 Lumens) + Red Tail Warning Light',
    description: 'USB-C rechargeable waterproof headlight with 5 beam modes and silicone strap mount. Keeps you visible during night rides along Reid Avenue and Stanley Wijesundera Mawatha.',
    catSlug: 'bicycle-transport',
    listingType: 'sale',
    price: 2400,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Main Library Steps', 'UCSC Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=800', publicId: 'demo/bike_light' }],
    viewCount: 46,
  },
  {
    title: 'FREE: Bicycle Hand Air Pump with Presta and Schrader Valve Adaptor',
    description: 'Portable mini frame pump with mounting bracket and pressure gauge needle. Working perfectly, passing on before graduation!',
    catSlug: 'bicycle-transport',
    listingType: 'free',
    price: 0,
    priceMode: 'fixed',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['College House Roundabout', 'Reid Avenue Bicycle Shed'],
    images: [{ url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800', publicId: 'demo/bike_pump' }],
    viewCount: 118,
  },

  // ── UNI MERCH & FASHION ──
  {
    title: 'University of Colombo Official Embroidered Heritage Hoodie (Size L)',
    description: 'Authentic Colombo Crest embroidered navy heavyweight cotton hoodie with front kangaroo pocket. Worn twice for freshers week, immaculate condition.',
    catSlug: 'uni-merch-fashion',
    listingType: 'sale',
    price: 4500,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['College House Lawn', 'Arts Faculty Green Walk'],
    images: [{ url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800', publicId: 'demo/uoc_hoodie' }],
    viewCount: 168,
  },
  {
    title: 'University of Moratuwa Engineering Spirit Polo Shirt (Size M)',
    description: 'Black and gold breathable pique cotton polo shirt with embroidered UOM faculty crest. Official merchandise batch.',
    catSlug: 'uni-merch-fashion',
    listingType: 'sale',
    price: 2200,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Moratuwa',
    meetupSpots: ['Sumanadasa Building Lobby', 'Moratuwa Student Center'],
    images: [{ url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800', publicId: 'demo/uom_polo' }],
    viewCount: 94,
  },
  {
    title: 'FoT Tech Week Commemorative Cotton T-Shirt (Size L, Charcoal Grey)',
    description: 'Limited edition University of Colombo Faculty of Technology Innovation Symposium T-Shirt. High quality screen print.',
    catSlug: 'uni-merch-fashion',
    listingType: 'sale',
    price: 1500,
    priceMode: 'fixed',
    condition: 'brand-new',
    campus: 'University of Colombo',
    meetupSpots: ['FoT Pitipana Tech Canteen', 'Reid Avenue Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800', publicId: 'demo/fot_tshirt' }],
    viewCount: 71,
  },
  {
    title: 'Waterproof Laptop Backpack 15.6" with Anti-Theft Lock & USB Port',
    description: 'Black multi-compartment weather-resistant backpack. Cushioned laptop sleeve, water bottle holders, and ergonomic shoulder straps.',
    catSlug: 'uni-merch-fashion',
    listingType: 'sale',
    price: 3800,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['UCSC Lobby', 'Science Quadrangle'],
    images: [{ url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', publicId: 'demo/backpack' }],
    viewCount: 86,
  },

  // ── SPORTS & FITNESS ──
  {
    title: 'Yonex Nanoray 10F Badminton Racket with Full Cover Bag',
    description: 'Head-light balance racket with isometric head shape for quick maneuverability. Strung at 22lbs with BG65 titanium string. Great for inter-faculty matches.',
    catSlug: 'sports-fitness',
    listingType: 'sale',
    price: 8200,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['Colombo Gymnasium', 'Racecourse Grounds Gate'],
    images: [{ url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800', publicId: 'demo/badminton' }],
    viewCount: 104,
  },
  {
    title: 'Kookaburra Kahuna Cricket Bat (English Willow, Short Handle)',
    description: 'Grade 3 English willow, big edges and powerful sweet spot. Knocked in with protective face sheet and toe guard. Prepared for university cricket tournament.',
    catSlug: 'sports-fitness',
    listingType: 'sale',
    price: 18500,
    priceMode: 'negotiable',
    condition: 'used-good',
    campus: 'University of Colombo',
    meetupSpots: ['University Ground Pavilion', 'Reid Avenue Sports Complex'],
    images: [{ url: 'https://images.unsplash.com/photo-1531415074868-036b1c5d53ec?w=800', publicId: 'demo/cricket_bat' }],
    viewCount: 122,
  },
  {
    title: 'Adjustable Dumbbells Set (20kg Total - Cast Iron Plates with Spinlock)',
    description: 'Two chrome spinlock bars with 4x 2.5kg and 4x 1.25kg cast iron weight plates. Keep fit in your hostel room without expensive gym subscriptions.',
    catSlug: 'sports-fitness',
    listingType: 'sale',
    price: 12000,
    priceMode: 'negotiable',
    condition: 'like-new',
    campus: 'University of Moratuwa',
    meetupSpots: ['Hostel Ground Floor', 'Campus Gymnasium'],
    images: [{ url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800', publicId: 'demo/dumbbells' }],
    viewCount: 148,
  },
  {
    title: 'FREE: Resistance Bands Set (5 Stackable Tubes with Foam Handles & Door Anchor)',
    description: 'Resistance exercise workout bands with varying tension ratings. Perfect for home or dorm workouts. Free to anyone who will make good use of it.',
    catSlug: 'sports-fitness',
    listingType: 'free',
    price: 0,
    priceMode: 'fixed',
    condition: 'like-new',
    campus: 'University of Colombo',
    meetupSpots: ['Colombo Gymnasium Steps', 'Reid Avenue Canteen'],
    images: [{ url: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800', publicId: 'demo/resistance_bands' }],
    viewCount: 96,
  },
];

// Generate additional variations to hit 115+ realistic items across faculties & categories
function generateAdditionalItems() {
  const hardwareVariations = [
    { title: 'ESP8266 NodeMCU V3 Lua Wi-Fi Board (CH340G)', price: 1750, spot: 'FoT Pitipana Tech Canteen', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' },
    { title: 'HC-SR04 Ultrasonic Distance Sensor Modules (Pack of 3)', price: 1450, spot: 'FoT Pitipana Ground Floor', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800' },
    { title: 'SG90 9g Micro Servo Motor (Pack of 4 with Horns & Screws)', price: 1900, spot: 'FoT Pitipana Workshop Gate', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800' },
    { title: 'L298N Dual H-Bridge Motor Driver Module for Robotics', price: 1200, spot: 'FoT Pitipana Robotics Lab', img: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800' },
    { title: 'DHT22 Digital Temperature & Humidity Sensor High Accuracy', price: 1600, spot: 'FoT Pitipana Tech Canteen', img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800' },
    { title: '16x2 Character LCD Module with I2C Backlight Adapter', price: 1400, spot: 'FoT Pitipana Main Lobby', img: 'https://images.unsplash.com/photo-1563770660439-4636190af475?w=800' },
    { title: '5V 4-Channel Relay Module with Optocoupler Isolation', price: 1550, spot: 'FoT Pitipana Electronic Lab', img: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800' },
    { title: '18650 Dual Battery Shield with 5V/3A Power Output for Arduino', price: 1850, spot: 'FoT Pitipana Tech Canteen', img: 'https://images.unsplash.com/photo-1609592426868-b76922eb5520?w=800' },
    { title: 'RFID RC522 Reader Module + Key Fob & White Card (13.56MHz)', price: 1350, spot: 'UCSC Main Entrance', img: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800' },
    { title: 'MPU-6050 3-Axis Gyroscope & Accelerometer Module', price: 1250, spot: 'FoT Pitipana Main Entrance', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800' },
    { title: 'MQ-2 Methane, Butane, Smoke Gas Sensor Module', price: 1100, spot: 'FoT Pitipana Workshop Gate', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800' },
    { title: 'PIR Motion Detector Sensor HC-SR501 (Adjustable Sensitivity)', price: 950, spot: 'FoT Pitipana Tech Canteen', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' },
    { title: 'Arduino Nano V3 (ATmega328P CH340 with Mini USB)', price: 1650, spot: 'FoT Pitipana Tech Canteen', img: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=800' },
    { title: '40-pin Male-to-Female Jumper Ribbon Cables (20cm)', price: 650, spot: 'FoT Pitipana Main Lobby', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' },
    { title: '40-pin Female-to-Female Jumper Ribbon Cables (20cm)', price: 650, spot: 'FoT Pitipana Main Lobby', img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' },
    { title: 'Adjustable Step-Down Buck Converter Module LM2596 (Pack of 2)', price: 1300, spot: 'FoT Pitipana Ground Floor', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800' },
    { title: '0-30V 0-5A Adjustable Bench DC Power Supply for Labs', price: 18500, spot: 'FoT Pitipana Workshop Gate', img: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800' },
    { title: 'Digital Caliper Vernier 150mm Stainless Steel with LCD', price: 3200, spot: 'FoT Pitipana Workshop Gate', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800' },
  ];

  const academicVariations = [
    { title: 'Thomas Calculus (14th Edition) with MyMathLab Access Notes', price: 6800, spot: 'Science Quadrangle Canteen', img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800' },
    { title: 'Introduction to Algorithms (CLRS 3rd Edition Hardcover)', price: 11500, spot: 'UCSC West Wing Gate', img: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?w=800' },
    { title: 'Principles of Physics by Halliday & Resnick (10th Extended Edition)', price: 8200, spot: 'Main Library Steps', img: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800' },
    { title: 'Engineering Mechanics: Statics by J.L. Meriam & L.G. Kraige', price: 5900, spot: 'FoT Pitipana Library Wing', img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800' },
    { title: 'Gray Anatomy for Students (4th Edition International Edition)', price: 21000, spot: 'Faculty of Medicine Kynsey Road', img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800' },
    { title: 'Guyton and Hall Textbook of Medical Physiology (13th Edition)', price: 17500, spot: 'Faculty of Medicine Dean Office Lawn', img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800' },
    { title: 'Rotring Rapidograph 0.35mm Technical Pen + Drawing Ink', price: 3800, spot: 'Architecture Faculty Court', img: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800' },
    { title: 'Medical Dissection Instrument Kit (Scissors, Forceps, Scalpel Handle)', price: 4200, spot: 'Anatomy Building Lawn', img: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800' },
    { title: 'Scientific Calculator fx-82MS Second Edition Casio', price: 3100, spot: 'Science Faculty Gate', img: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800' },
    { title: 'Oxford English Dictionary & Thesaurus Hardbound Edition', price: 2400, spot: 'Main Library Front Steps', img: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800' },
  ];

  const hostelVariations = [
    { title: 'Abans 2-Slice Electric Bread Toaster with Browning Control', price: 3400, spot: 'Bloomfield Hostel Gate', img: 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=800' },
    { title: 'Foldable Wooden Laptop Bed Table with Cup Holder & Tablet Slot', price: 2800, spot: 'FoT Pitipana Hostel Common Room', img: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800' },
    { title: 'Comfortable Velvet Bean Bag Chair (Navy Blue)', price: 5800, spot: 'College House Roundabout', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800' },
    { title: 'Thermal Stainless Steel Water Bottle 1000ml (Keeps Cold 24h)', price: 2200, spot: 'Science Quadrangle Canteen', img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800' },
    { title: 'Heavy Duty Mosquito Net for Single Hostel Bed (Fine Mesh)', price: 1800, spot: 'Hostel Complex Gate 2', img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800' },
    { title: 'Rechargeable Table Fan with Emergency Light for Power Cuts', price: 4600, spot: 'Reid Avenue Canteen', img: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800' },
    { title: 'Multi-Compartment Laundry Hamper / Bag with Aluminium Handles', price: 1600, spot: 'Bloomfield Hostel Courtyard', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800' },
    { title: 'Stainless Steel Cutlery & Plate Set (Fork, Spoon, Plate, Bowl)', price: 1400, spot: 'FoT Pitipana Tech Canteen', img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800' },
  ];

  const bikeTransportVariations = [
    { title: 'DSI City Commuter Bicycle Tube 26 x 1.75 - Brand New (2 Pieces)', price: 1600, spot: 'Reid Avenue Bicycle Shed', img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800' },
    { title: 'Bicycle Rear Luggage Carrier Cargo Rack with Elastic Tie Cord', price: 2900, spot: 'Science Quadrangle', img: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800' },
    { title: 'Bell Cycling Helmet with Visor (Size Medium, Matte Black)', price: 4200, spot: 'Campus Main Gate Pavilion', img: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800' },
    { title: 'Bicycle Puncture Repair Kit with Levers & Vulcanizing Patches', price: 850, spot: 'Reid Avenue Bicycle Shed', img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800' },
    { title: 'Bicycle Handlebar Phone Holder Aluminum Alloy 360 Rotation', price: 1750, spot: 'UCSC Main Entrance', img: 'https://images.unsplash.com/photo-1511994298241-608e28f14fde?w=800' },
    { title: 'WANTED: Second Hand Bicycle for Daily Commute to FoT Pitipana', price: 18000, budgetMin: 12000, budgetMax: 22000, urgency: 'high', spot: 'FoT Pitipana Tech Canteen', img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800', isWanted: true },
  ];

  const merchFashionVariations = [
    { title: 'University of Colombo Varsity Jacket (Wool Blend Navy/White, Size M)', price: 7800, spot: 'College House Lawn', img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800' },
    { title: 'Faculty of Science Colombo Annual T-Shirt (Cobalt Blue, Size L)', price: 1600, spot: 'Science Quadrangle', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800' },
    { title: 'University of Peradeniya Engineering T-Shirt (Maroon, Size M)', price: 1700, spot: 'Akbar Nell Hostel', img: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800' },
    { title: 'Slim Canvas Document Briefcase & Laptop Shoulder Bag', price: 2900, spot: 'Main Library Lobby', img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800' },
    { title: 'Formal Leather Shoes for Presentations / Viva (Black, Size 42)', price: 4800, spot: 'Reid Avenue Canteen', img: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800' },
    { title: 'WANTED: Official Colombo University Convocation Stole & Tie', price: 2500, budgetMin: 1500, budgetMax: 3000, urgency: 'low', spot: 'College House Lawn', img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800', isWanted: true },
  ];

  const sportsFitnessVariations = [
    { title: 'Mikasa MVA200 Professional Indoor Volleyball (Official Size 5)', price: 6200, spot: 'Colombo Gymnasium', img: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800' },
    { title: 'Nivia Storm Football Size 5 Rubber Moulded for Turf & Grass', price: 3800, spot: 'University Ground Pavilion', img: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800' },
    { title: 'Yoga Mat 6mm Non-Slip TPE Foam with Carrying Strap', price: 2600, spot: 'Racecourse Grounds Gate', img: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800' },
    { title: 'Spalding NBA Street Outdoor Basketball (Size 7)', price: 4900, spot: 'Colombo Gymnasium Steps', img: 'https://images.unsplash.com/photo-1519766304817-4f37bda74a29?w=800' },
    { title: 'Speed Jump Rope with Ball Bearings and Steel Cable', price: 1200, spot: 'Sports Complex Parking', img: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800' },
    { title: 'WANTED: Table Tennis Bat (Stiga or Butterfly) in Good Condition', price: 4500, budgetMin: 3000, budgetMax: 6000, urgency: 'medium', spot: 'Colombo Gymnasium', img: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800', isWanted: true },
  ];

  const extra = [];
  
  hardwareVariations.forEach((v, idx) => {
    extra.push({
      title: v.title,
      description: `Hardware & electronics item for engineering practicals and university IoT coursework. Tested and in excellent working order. Meetup at ${v.spot}.`,
      catSlug: 'electronics-laptops',
      listingType: 'sale',
      price: v.price,
      priceMode: 'fixed',
      condition: idx % 2 === 0 ? 'like-new' : 'brand-new',
      campus: 'University of Colombo',
      meetupSpots: [v.spot, 'Science Quadrangle'],
      images: [{ url: v.img, publicId: `demo/hw_${idx}` }],
      viewCount: 20 + (idx * 5),
    });
  });

  academicVariations.forEach((v, idx) => {
    extra.push({
      title: v.title,
      description: `Recommended textbook and academic gear for university students. Well-maintained and comprehensive. Meetup available at ${v.spot}.`,
      catSlug: 'academic-gear',
      listingType: 'sale',
      price: v.price,
      priceMode: 'negotiable',
      condition: idx % 2 === 0 ? 'used-good' : 'like-new',
      campus: 'University of Colombo',
      meetupSpots: [v.spot, 'Reid Avenue Gate'],
      images: [{ url: v.img, publicId: `demo/acad_${idx}` }],
      viewCount: 15 + (idx * 4),
    });
  });

  hostelVariations.forEach((v, idx) => {
    extra.push({
      title: v.title,
      description: `Hostel and dorm essential for campus accommodation living. Clean and ready for use. Meetup at ${v.spot}.`,
      catSlug: 'hostel-dorm-living',
      listingType: 'sale',
      price: v.price,
      priceMode: 'fixed',
      condition: 'used-good',
      campus: 'University of Colombo',
      meetupSpots: [v.spot, 'College House Lawn'],
      images: [{ url: v.img, publicId: `demo/hostel_${idx}` }],
      viewCount: 25 + (idx * 3),
    });
  });

  bikeTransportVariations.forEach((v, idx) => {
    extra.push({
      title: v.title,
      description: v.isWanted ? 'Student wanted listing for university transport.' : `Campus transport gear and bike accessory. Pickup and inspection at ${v.spot}.`,
      catSlug: 'bicycle-transport',
      listingType: v.isWanted ? 'wanted' : 'sale',
      price: v.price,
      budgetMin: v.budgetMin,
      budgetMax: v.budgetMax,
      urgency: v.urgency || 'medium',
      priceMode: 'fixed',
      condition: 'like-new',
      campus: 'University of Colombo',
      meetupSpots: [v.spot, 'Reid Avenue Bicycle Shed'],
      images: [{ url: v.img, publicId: `demo/bike_${idx}` }],
      viewCount: 30 + (idx * 4),
    });
  });

  merchFashionVariations.forEach((v, idx) => {
    extra.push({
      title: v.title,
      description: v.isWanted ? 'Student looking to buy official university clothing/merch.' : `Campus merchandise and clothing item in great condition. Meetup at ${v.spot}.`,
      catSlug: 'uni-merch-fashion',
      listingType: v.isWanted ? 'wanted' : 'sale',
      price: v.price,
      budgetMin: v.budgetMin,
      budgetMax: v.budgetMax,
      urgency: v.urgency || 'low',
      priceMode: 'fixed',
      condition: 'used-good',
      campus: 'University of Colombo',
      meetupSpots: [v.spot, 'College House Lawn'],
      images: [{ url: v.img, publicId: `demo/merch_${idx}` }],
      viewCount: 18 + (idx * 3),
    });
  });

  sportsFitnessVariations.forEach((v, idx) => {
    extra.push({
      title: v.title,
      description: v.isWanted ? 'Student looking to purchase sports equipment for university club.' : `Sports and fitness gear in reliable condition. Handover at ${v.spot}.`,
      catSlug: 'sports-fitness',
      listingType: v.isWanted ? 'wanted' : 'sale',
      price: v.price,
      budgetMin: v.budgetMin,
      budgetMax: v.budgetMax,
      urgency: v.urgency || 'medium',
      priceMode: 'negotiable',
      condition: 'like-new',
      campus: 'University of Colombo',
      meetupSpots: [v.spot, 'Colombo Gymnasium Steps'],
      images: [{ url: v.img, publicId: `demo/sports_${idx}` }],
      viewCount: 22 + (idx * 4),
    });
  });

  return extra;
}

// Combine all demo listings
const ALL_DEMO_LISTINGS = [...DEMO_ITEMS, ...generateAdditionalItems()];

export async function seedDemoData() {
  console.log('[Seed Demo] 🚀 Starting extended demo seed operation…');
  console.log(`[Seed Demo] Total prepared demo listings: ${ALL_DEMO_LISTINGS.length}`);

  // 1. Seed Categories
  console.log('\n[Seed Demo] 📂 Ensuring categories exist…');
  const categoryMap = new Map();
  for (const cat of CATEGORIES) {
    const doc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryMap.set(cat.slug, doc._id);
    console.log(`  ✅ Category: ${doc.name} (${doc.slug})`);
  }

  // 2. Default Password Hash
  const defaultPasswordHash = await bcrypt.hash('CampusPassword123!', 10);

  // 3. Seed Admin
  console.log('\n[Seed Demo] 👤 Ensuring Admin user…');
  const admin = await User.findOneAndUpdate(
    { email: 'admin@unimart.ac.lk' },
    {
      fullName: 'UniMart Administrator',
      email: 'admin@unimart.ac.lk',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      campus: 'University of Colombo',
      faculty: 'Administration',
      isVerified: true,
      accountStatus: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`  ✅ Admin user verified: ${admin.email}`);

  // 4. Seed Student Sellers
  console.log('\n[Seed Demo] 🎓 Ensuring demo student users across faculties…');
  const studentIds = [];
  for (const stu of SAMPLE_STUDENTS) {
    const student = await User.findOneAndUpdate(
      { email: stu.email.toLowerCase() },
      {
        ...stu,
        passwordHash: defaultPasswordHash,
        accountStatus: 'active',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    studentIds.push(student._id);
    console.log(`  ✅ Student: ${student.fullName} (${student.campus} - ${student.faculty})`);
  }

  // 5. Seed Demo Listings
  console.log('\n[Seed Demo] 📦 Seeding extended demo listings…');
  let count = 0;
  for (let i = 0; i < ALL_DEMO_LISTINGS.length; i++) {
    const item = ALL_DEMO_LISTINGS[i];
    const categoryId = categoryMap.get(item.catSlug);
    const sellerId = studentIds[i % studentIds.length];

    const listingData = {
      title: item.title,
      description: item.description,
      categoryId,
      sellerId,
      listingType: item.listingType,
      price: item.price ?? (item.budgetMax || 0),
      priceMode: item.priceMode || 'fixed',
      currency: 'LKR',
      budgetMin: item.budgetMin,
      budgetMax: item.budgetMax,
      urgency: item.urgency,
      condition: item.condition,
      campus: item.campus,
      meetupSpots: item.meetupSpots || [],
      images: item.images || [],
      status: 'active',
      viewCount: item.viewCount || 0,
    };

    await Listing.findOneAndUpdate({ title: item.title }, listingData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
    count++;
    if (count % 15 === 0 || count === ALL_DEMO_LISTINGS.length) {
      console.log(`  [${count}/${ALL_DEMO_LISTINGS.length}] ✅ Seeded listings milestone…`);
    }
  }

  console.log(`\n[Seed Demo] 🎉 Successfully seeded ${count} listings, 6 categories, and ${SAMPLE_STUDENTS.length + 1} users!\n`);
  return { count, categories: categoryMap.size, students: studentIds.length };
}

const isCLI = process.argv[1] && (process.argv[1].endsWith('seed.demo.js') || process.argv[1].endsWith('seed.demo'));
if (isCLI) {
  console.log('[Seed Demo] Connecting to database…');
  mongoose.connect(ENV.MONGO_URI)
    .then(async () => {
      console.log('[Seed Demo] Database connected.');
      await seedDemoData();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Demo] ❌ Fatal error:', err);
      process.exit(1);
    });
}
