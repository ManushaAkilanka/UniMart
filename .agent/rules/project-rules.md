# UniMart Workspace Rules

All agents and contributors working on UniMart must strictly follow these rules:

1. **Technology Stack**:
   - **Client**: React + Vite + Tailwind CSS + React Router.
   - **Server**: Node.js + Express + Mongoose (MongoDB Atlas), strictly layered as `config` / `models` / `routes` / `controllers` / `services` / `middleware`, with thin controllers that delegate immediately to services.
   - **Language**: Modern JavaScript, ES modules (`"type": "module"` in `package.json`).

2. **No Online Payments**:
   - Students arrange payment offline (cash or peer direct handoff upon physical inspection on campus).
   - No payment gateways, cards, or transaction processors.

3. **Strict Currency**:
   - Platform currency is strictly Sri Lankan Rupees (`LKR`, formatted as `Rs. 4,500` or `Rs. 0` for Free Pool items).

4. **MCP Stitch UI Source of Truth**:
   - Every UI screen, layout, color, and component must be built directly from the Stitch designs via MCP (`projects/476644850781708724`), never from memory or arbitrary guesses.

5. **Server-Side Validation & Security**:
   - The client is NEVER trusted.
   - The server enforces all input validation, sanitization, authorization, and filters.
   - Use **Zod** schemas for validating all incoming request payloads, queries, and params.
   - Never pass raw client input directly into Mongo queries (prevent NoSQL injection).

6. **Authentication & Password Security**:
   - Passwords must be hashed using `bcrypt` (or `argon2`).
   - Authentication session tokens must be stored in secure, **HTTP-only cookies** (`SameSite`, `HttpOnly`, `Secure` in production).

7. **Secret Management**:
   - Secrets and environment configuration belong exclusively in `.env` files.
   - Never commit `.env` or sensitive credentials to version control. Always maintain `.env.example` templates.

8. **Verification & Quality Protocol**:
   - After completing each task, run the applications and the linter, verify there are no errors, and report the results.
