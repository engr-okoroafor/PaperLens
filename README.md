# PaperLens

PaperLens is a small Angular app for searching open research papers in the [CORE](https://core.ac.uk/) v3 index. It is a SterlingCode interview project: a boolean query goes to CORE, the works come back as cards, and charts describe the whole matching set.

Angular **22.3** (standalone components, signals, `@if` / `@for`, zoneless change detection, TypeScript `strict`, Tailwind CSS 4).

## Run locally

```bash
npm install
npm start
```

`npm start` boots two processes:

- the Angular dev server at <http://127.0.0.1:4200>
- a local CORE proxy at <http://127.0.0.1:8787>, which `ng serve` forwards from `/api/core`

The browser only talks to `/api/core`. An optional API key is read on the server from `CORE_API_KEY` and sent to `https://api.core.ac.uk` as `Authorization: Bearer …`. It is never written into the client bundle.

```bash
cp .env.example .env
# then edit CORE_API_KEY if you have one
```

Leave the variable empty to call CORE without a key. Unauthenticated calls are tightly rate-limited. On `401` or `429` the proxy retries with backoff (it will not wait out a long `Retry-After`), then the UI explains what happened and switches to the built-in sample set. Every sample card is marked **Sample data**.

You can also run the pieces separately:

```bash
npm run start:api
npm run start:web
```

## Test

```bash
npx ng test --watch=false
```

Vitest (the Angular 22 default) covers the boolean parser, the CORE response normalizer, highlighting, export, query composition, the sample filter, and the HTTP client’s `200` and `429` paths.

## Build

```bash
npm run build
```

Production files are written to **`dist/paperlens/browser`**. That directory is what `vercel.json` publishes.

## Deploy on Vercel

The repo is ready to connect. Do not create the project from here; import the Git repository in the Vercel dashboard (or `vercel link` on your machine).

- Build command: `npm run build` (already set in `vercel.json`)
- Output directory: `dist/paperlens/browser`
- The function in `api/core.js` is the production proxy. Set `CORE_API_KEY` in the project’s environment variables if you have a key. Leave it unset to call CORE anonymously.
- SPA routes rewrite to `index.html`. Requests under `/api` stay on the serverless function.

## Architecture

```
browser  →  /api/core  →  api.core.ac.uk/v3/search/works
                       →  api.core.ac.uk/v3/search/works/aggregate
```

- `src/app/core/services/search-store.service.ts` holds the query, page size, sort, year range, chart facet, and URL state as signals.
- `src/app/core/services/core-api.service.ts` calls the same-origin proxy. `api/lib/proxy-core.cjs` performs the upstream request, attaches the key when present, and retries `429` / `5xx` with exponential backoff.
- Search results are normalized in `src/app/core/api/normalize.ts` (camelCase and snake_case).
- Charts prefer CORE’s aggregate endpoint (`yearPublished`, `publisher`, `documentType`, `language`, `authors`, `fieldOfStudy`), so the figures describe every matching work, not only the current page. If that call fails, the charts count the papers loaded so far and the panel says so. The sample fallback counts the whole matching sample set.
- `src/app/core/query/boolean-query.ts` is a small parser for `AND`, `OR`, `NOT`, parentheses, quoted phrases, field filters, comparisons, and `_exists_:`. The main box is sent to CORE. “Filter loaded results” evaluates the same parser in the browser. The sample set uses it too.
- Bookmarks, saved searches, and recent queries live in `localStorage` (`src/app/core/services/library.service.ts`).

Before the first query, the result list and the charts are empty on purpose.

## Keyboard

| Key | Action |
| --- | --- |
| `/` | Focus the search box |
| `?` | Open help |
| `Esc` | Close help, the tour, the reading list, or the paper drawer |

The first visit opens a three-step spotlight tour (result count, boolean search, charts). Replay it from Help.

## Extra features

These are beyond the numbered steps in the brief:

1. **Saved and recent searches**, kept in `localStorage`.
2. **Bookmarks / reading list**, also on this device, with a count in the header.
3. **Multi-format Report Export**: Download papers on the page directly as formatted Microsoft Word document (`.doc`), high-fidelity printable/saveable PDF with PaperLens branding and metadata, as well as CSV, JSON, and BibTeX.
4. **Typewriter Animated Search Box**: Dynamic, cycling typewriter prompt displaying complex scientific boolean queries to inspire researchers.
5. **Vibrant Aurora Palette**: Enhanced atmospheric background incorporating vibrant neon lime, glowing teal, electric violet, and soft magenta.
6. **Animated Interactive Guided Tour**: Features active spotlight halo, pulsing focus beacon, step progress dots, Back button, and instant Close (X) button with smooth animation.
7. **Futuristic Quantum Pager**: Glowing glassmorphism pagination controls with active quantum pulse indicator and styled batch loader.
8. **Animated Back to Top / Bottom Floating Controls**: Responsive FAB group that appears automatically on scroll for seamless navigation.
9. **Interactive Chart Tooltips & Rich Visuals**: High-contrast, multi-dimensional tooltips showing work volume, percentage share of the research cohort, and custom palette.
10. **Shareable URL state** for the query, page size, page, sort, year range, page filter, paging mode, and chart facet.
11. **Paper detail drawer** with the abstract, venue, DOI, direct download links, and sticky floating action bar (Close & Bookmark) with single-paper PDF and Word (.doc) exports relocated cleanly to the drawer bottom.
12. **High-Contrast Dark & Light Mode**: Accessible theme switcher with customized light mode styling, glowing card borders, and visible high-contrast tooltips.
13. **Global Multi-Language Support (12 Languages)**: Comprehensive scientific research country language localization (English 🇺🇸, Chinese 🇨🇳, German 🇩🇪, Japanese 🇯🇵, French 🇫🇷, Korean 🇰🇷, Portuguese 🇧🇷, Italian 🇮🇹, Spanish 🇪🇸, Hindi 🇮🇳, Russian 🌐, Arabic 🇸🇦) seamlessly switchable from the header bar.
14. **OWASP Top 10 Hardened Security & Rate Limiting**: Serverless proxy with strict security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), in-memory IP sliding rate limiter, and external navigation verification guards.
15. **Industrial-Grade CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) automating dependency auditing, testing, and production builds on push and pull requests.
16. **Search-term highlighting** in titles and abstracts, including the page filter, skipping `NOT` terms.
17. **Sort** by relevance, newest year, or oldest year (`yearPublished:asc|desc` on the CORE request).
18. **Year range filter** (`yearPublished>=` / `yearPublished<=`) with future anomaly date filtering (<= 2026).
19. **Insights strip** with total hits, the year span, and the top publisher. The total counts up.
20. **Toasts** for saves, exports, bookmarks, and copied links.
21. **Server-side retry and sample fallback** so a `401`, `429`, or network failure still leaves a usable, clearly labeled demo.

---

## Submission Summary & Links

- **Live Deployment URL:** [https://paperlens-omega.vercel.app/](https://paperlens-omega.vercel.app/)
- **GitHub Repository:** [https://github.com/engr-okoroafor/PaperLens.git](https://github.com/engr-okoroafor/PaperLens.git)

