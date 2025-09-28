# Repository Guidelines

## Project Structure & Module Organization
- `src/app` — Next.js App Router (React Server Components by default). Providers live in `src/app/providers` (e.g., Convex client provider). Entry: `src/app/page.tsx`.
- `src/components/ui` — Reusable UI primitives (shadcn-style). Collocate domain components under `src/components`.
- `src/lib` — Utilities and setup. Path alias `@/*` maps to `./src/*`.
- `convex` — Convex functions and schema. Files in `convex/_generated` are build artifacts; do not edit.
- `public` — Static assets served at `/`.

## Build, Test, and Development Commands
- `npm run dev` — Start Next.js (Turbopack) at http://localhost:3000. Requires `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.
- `npm run build` — Production build of the app.
- `npm start` — Serve the production build locally.
- `npm run lint` — ESLint (Next core-web-vitals + TypeScript). Fix all warnings before PRs.
- `npm run convex:dev` — Run Convex dev (uses `convex.json`).
- `npm run convex:deploy` — Deploy Convex functions.

## Coding Style & Naming Conventions
- TypeScript strict mode. Prefer explicit types on public APIs.
- Indent 2 spaces. Files in `kebab-case`. React components in `PascalCase`.
- Functions/variables `camelCase`; types/interfaces `PascalCase`; hooks `useX`.
- RSC by default; add `"use client"` only when necessary.
- Imports: group std → third‑party → local; prefer `@/*` alias.

## Testing Guidelines
- No test runner configured yet. If adding tests, prefer Vitest + React Testing Library.
- Place tests as `src/**/__tests__` or alongside files (`Component.test.tsx`).
- Add an `npm test` script and ensure tests run headless in CI.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat|fix|chore|docs(scope): message`. Example: `feat(churches): seed default funds`.
- One logical change per PR. Describe intent, link issues, and include screenshots/GIFs for UI changes.
- Note any env or migration impacts. Run `npm run lint && npm run build` before opening the PR.

## Security & Configuration Tips
- Never commit secrets. `.env*` is ignored; set `NEXT_PUBLIC_CONVEX_URL` in `.env.local`.
- Do not edit `convex/_generated/*`; regenerate via `npm run convex:dev`.
- Confirm access and environment before `npm run convex:deploy`.
