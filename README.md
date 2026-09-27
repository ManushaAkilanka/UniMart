# UniMart — Campus Marketplace for Sri Lankan Universities

UniMart is a student-to-student peer commerce platform designed for Sri Lankan university campuses (starting with University of Colombo). The platform enables verified university students to buy, sell, exchange, and giveaway textbooks, electronics, hostel gear, and academic tools safely within their campus grounds.

---

## 🏛️ System Architecture

UniMart is configured as a MERN monorepo:

```
UniMart/
├── .agent/
│   └── rules/
│       └── project-rules.md     # Mandatory development rules & security guidelines
├── client/                      # React 18 + Vite + Tailwind CSS + React Router
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Navbar, Footer, PageLayout
│   │   │   └── ui/              # Reusable UI component library (Stitch design tokens)
│   │   ├── pages/               # Route views (DesignCheck, etc.)
│   │   └── ...
│   └── vite.config.js           # API proxy to backend (/api -> localhost:5000)
├── server/                      # Node.js + Express + Mongoose (ES Modules)
│   ├── src/
│   │   ├── config/              # Database connection & env validation
│   │   ├── controllers/         # Thin controllers
│   │   ├── middleware/          # Zod validation, auth, error handler
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # Express API routers (GET /api/health)
│   │   └── services/            # Core business logic
│   └── server.js                # App entrypoint
└── package.json                 # Monorepo workspace orchestration
```

---

## 🔒 Key Principles & Rules
1. **Offline Student Payments**: Zero online payment integrations. All transactions happen in person on campus upon physical inspection.
2. **Strict Currency**: Sri Lankan Rupees (`LKR` / `Rs.`).
3. **Verified Accounts**: Student identity linked to verified university domains (`@cmb.ac.lk`, `@*.ac.lk`).
4. **Stitch Design Alignment**: Every UI screen and token is derived directly from the Stitch designs (`projects/476644850781708724`).
5. **Zero Client Trust**: All authorization, schema validation (via Zod), and sanitization is enforced strictly on the server.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` in both `/server` and `/client`:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 3. Run Development Servers
```bash
# Run both server & client concurrently
npm run dev

# Or individually:
npm run dev:server   # Starts Express API on port 5000
npm run dev:client   # Starts Vite React dev server on port 5173
```

### 4. Health Check & Component Verification
- **API Health**: `http://localhost:5000/api/health`
- **Design System Showcase**: `http://localhost:5173/design-check`
