<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a self-contained **Next.js 16** (App Router, Turbopack) + React 19 web app ("UPVC Design") for designing uPVC windows/doors and managing customers/projects/orders. The UI is Arabic (RTL) and mobile-first.

- Single service, no backend. There are no API routes, no database, and no environment variables. All persistence is in the browser `localStorage` (keys like `upvc-projects`, `upvc-customers`, `upvc-project-items`), seeded with sample data. You can exercise the whole product with just the dev server.
- Commands (see `package.json`): dev = `npm run dev` (http://localhost:3000), build = `npm run build`, lint = `npm run lint`. There is no automated test suite.
- `npm run lint` currently reports pre-existing errors (React 19 `react-hooks` rules such as `set-state-in-effect`, `refs`, `purity`). These are not environment problems; a non-zero lint exit is the repo's current baseline.
