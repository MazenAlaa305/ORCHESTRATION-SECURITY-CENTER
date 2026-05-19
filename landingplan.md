# Landing Page — Full Step-by-Step Plan

A complete, build-ready plan for adding a public marketing/landing page to the **Orchestration Security Center** project (React 18 + Vite + Tailwind + Framer Motion + React Router v7).

The landing page is the first thing an unauthenticated visitor sees at `/`. It explains the product, builds trust, and drives the visitor toward `Sign Up` or `Login`.

---

## 1. Goals & Success Criteria

**Primary goal:** Convert a visitor into a signed-up user (or a demo request).

**Secondary goals:**
- Communicate what the platform does in under 10 seconds.
- Show credibility (graduation project, 11-person team, real tools: Nmap, Nuclei, OpenVAS).
- Provide a clear path to `/signup` and `/login`.

**Success criteria:**
- Loads in < 2s on mid-tier laptop.
- Lighthouse score ≥ 90 (Performance, Accessibility, Best Practices, SEO).
- Mobile-responsive from 320px upward.
- Works without JavaScript for core text content (progressive enhancement is a stretch goal — Vite SPA, so accept SPA limits).

---

## 2. Information Architecture (Sections)

The page is a single long scroll with these sections, in order:

1. **Navbar** — fixed/transparent-on-top: Logo · Features · How It Works · Pricing · Docs · `Login` · `Sign Up (CTA)`.
2. **Hero** — headline, sub-headline, primary CTA (`Get Started`), secondary CTA (`Watch Demo` or `View Live Dashboard`), animated dashboard mockup or gradient backdrop.
3. **Social Proof / Trust Strip** — "Built on industry-standard tools" with logos: Nmap, Nuclei, OpenVAS, Wazuh, FastAPI, React.
4. **Problem Statement** — 3 pain-point cards (SMEs lack SOC budget, tools = noise, CVSS ≠ business impact).
5. **Solution / Key Features** — 4–6 feature cards with Lucide icons:
   - Deterministic 4-Stage Pipeline
   - Risk Scoring in Business Terms
   - AI Advisory (read-only)
   - SIEM Integration (Wazuh)
   - Role-Based Access Control
   - Real-time WebSocket Updates
6. **How It Works** — 4-step horizontal/vertical timeline matching the scan pipeline (Recon → Attack → Deep Scan → Score & Advise).
7. **Live Dashboard Preview** — large screenshot/animated GIF/MP4 of the actual dashboard with annotated callouts.
8. **Stats / Outcomes Bar** — "1,000 raw logs → 5 action items", "4-stage pipeline", "11-person team", etc.
9. **Pricing / Tiers** (optional for FYP) — Free Lab, Team, Enterprise. If not building pricing, replace with **Use Cases** section.
10. **FAQ** — accordion with 5–8 common questions.
11. **Final CTA Block** — big gradient banner: "Ready to see your network's hidden risks? — `Start Free`".
12. **Footer** — Product · Resources · Company · Legal · Social · Copyright.

---

## 3. Routing & Integration Plan

Current state ([App.jsx](the-dashboard-project--main(1)/the-dashboard-project--main/frontend/src/App.jsx)) redirects unknown paths to `/dashboard/overview`. We change this so `/` shows the public landing page.

### Step-by-step routing changes

1. Create [frontend/src/pages/LandingPage.jsx](the-dashboard-project--main(1)/the-dashboard-project--main/frontend/src/pages/LandingPage.jsx).
2. In [App.jsx](the-dashboard-project--main(1)/the-dashboard-project--main/frontend/src/App.jsx):
   - Import `LandingPage`.
   - Add `<Route path="/" element={<RouteShell><LandingPage /></RouteShell>} />`.
   - Change the catch-all to redirect unknown paths to `/` instead of `/dashboard/overview`.
3. Inside `LoginPage`/`SignUpPage`, after a successful auth, continue redirecting to `/dashboard/overview`.
4. If a logged-in user lands on `/`, optionally auto-redirect to `/dashboard/overview` (use the auth store + `useEffect` + `Navigate`).

---

## 4. File / Folder Structure

Create a dedicated `landing/` folder under components to keep marketing UI separate from the app shell.

```
frontend/src/
├── pages/
│   └── LandingPage.jsx               # composes the sections
└── components/
    └── landing/
        ├── LandingNavbar.jsx
        ├── Hero.jsx
        ├── TrustStrip.jsx
        ├── ProblemSection.jsx
        ├── FeaturesGrid.jsx
        ├── HowItWorks.jsx
        ├── DashboardPreview.jsx
        ├── StatsBar.jsx
        ├── PricingTable.jsx          # or UseCases.jsx
        ├── FAQAccordion.jsx
        ├── FinalCTA.jsx
        ├── LandingFooter.jsx
        └── shared/
            ├── SectionContainer.jsx  # max-w wrapper + padding
            ├── GradientButton.jsx    # primary CTA
            └── FeatureCard.jsx
```

---

## 5. Visual Design System

- **Theme:** dark-first (matches existing dashboard). Background = near-black `#0A0B14` with subtle radial gradients.
- **Accent colors:** indigo → cyan gradient already in [gradient-styles.css](the-dashboard-project--main(1)/the-dashboard-project--main/frontend/src/gradient-styles.css) — reuse.
- **Typography:** Inter (system fallback). Hero headline 48–72px, section headings 32–40px, body 16–18px.
- **Spacing:** Tailwind scale; sections use `py-24 md:py-32`.
- **Iconography:** [lucide-react](https://lucide.dev) (already in deps).
- **Motion:** [framer-motion](https://www.framer.com/motion/) (already in deps). Use `whileInView` + `viewport={{ once: true }}` for scroll reveals; keep `transition.duration` ≤ 0.6s.
- **Imagery:** dashboard screenshots (place in `frontend/public/landing/`).

---

## 6. Section-by-Section Build Steps

### 6.1 Navbar
- Sticky `position: fixed`, `backdrop-blur` on scroll (toggle a class once `scrollY > 40`).
- Mobile: hamburger → slide-down menu.
- Links use `react-router-dom` `Link` for internal, `<a>` for anchor jumps (`#features`).

### 6.2 Hero
- Two-column grid on `lg+`, stacked on mobile.
- Left: H1 ("See the threats your SME has been missing"), sub-headline (one sentence problem→solution), 2 buttons.
- Right: animated dashboard mockup — start with a static PNG, upgrade later to a looping `<video muted autoplay playsinline>`.
- Background: layered radial gradients + subtle SVG grid.

### 6.3 Trust Strip
- Single horizontal row of grayscale tool logos. Hover → color.
- One-line caption above: "Powered by trusted open-source security tooling."

### 6.4 Problem Section
- Heading: "The SME Protection Gap."
- 3 cards in a `grid-cols-1 md:grid-cols-3`.
- Each card: icon + pain title + 2-line description.

### 6.5 Features Grid
- 6 cards in `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
- Hover: subtle lift + gradient border.
- Each links (anchor) to deeper content or to `/signup`.

### 6.6 How It Works
- Vertical timeline on mobile, horizontal on desktop.
- 4 numbered steps with icon, title, 1-sentence description.
- Optional: small inline mini-diagram of the pipeline.

### 6.7 Dashboard Preview
- Big bordered screenshot, slight tilt with `transform: perspective(...)`.
- 3–4 absolutely-positioned callouts ("Real-time alerts", "Risk score", "AI advice") that animate in on scroll.

### 6.8 Stats Bar
- Full-bleed gradient strip with 4 large numbers (use `framer-motion` count-up).

### 6.9 Pricing / Use Cases
- If pricing: 3 cards (Free/Lab, Team, Enterprise). Highlight middle with `ring` + badge.
- If use cases: 3 vertical cards describing personas (IT Admin, MSP, Compliance Auditor).

### 6.10 FAQ
- Accordion component built with `framer-motion` `AnimatePresence` for height animations. No extra deps needed.
- 5–8 Q&As. Keep answers ≤ 3 sentences.

### 6.11 Final CTA
- Centered, full-bleed gradient block.
- H2 + 1-line subhead + primary button → `/signup`.

### 6.12 Footer
- 4-column link grid + logo column.
- Bottom row: copyright + small print + social icons.

---

## 7. Content Draft (placeholders to replace)

- **Hero H1:** "Cybersecurity orchestration built for the SMEs that big SOCs forgot."
- **Hero sub:** "Chain Nmap, Nuclei, and OpenVAS into a single deterministic pipeline. Turn 1,000 raw alerts into 5 prioritized actions."
- **Primary CTA:** "Start Free" → `/signup`
- **Secondary CTA:** "See it live" → opens dashboard preview modal or scrolls to section
- **Stats:** `4-stage pipeline` · `1000→5 alerts→actions` · `Open-source core` · `Read-only AI advisor`

---

## 8. Accessibility Checklist

- All interactive elements reachable by keyboard; visible focus rings.
- `alt` text on every image; decorative SVGs `aria-hidden`.
- Color contrast ≥ WCAG AA (especially gradient text — use a solid fallback).
- Respect `prefers-reduced-motion`: disable scroll-triggered animations for those users.
- Heading order: one `<h1>` (hero), then `<h2>` per section.
- Forms (if any inline) have labels.

---

## 9. Performance Plan

- Use `loading="lazy"` on every image below the fold.
- Compress screenshots: WebP/AVIF, max 200KB each.
- Self-host the Inter font with `font-display: swap`.
- Code-split: lazy-load the landing page with `React.lazy` + `Suspense` so the dashboard bundle isn't downloaded on `/`.
- Avoid heavy libs on landing route: do **not** import `recharts`, `d3-*`, `react-force-graph-2d` here.

---

## 10. SEO & Meta

- Set `<title>` and `<meta name="description">` via a small helper (or `react-helmet-async` — add only if needed).
- Open Graph + Twitter Card tags in [frontend/index.html](the-dashboard-project--main(1)/the-dashboard-project--main/frontend/index.html).
- Add `public/og-image.png` (1200×630).
- Add `public/favicon.svg` if missing.
- Add `public/robots.txt` allowing crawl of `/` and disallowing `/dashboard*`.
- Add `public/sitemap.xml` with `/`.

---

## 11. Analytics & Conversion Tracking (optional)

- Add Plausible/Umami/GA4 snippet to `index.html` (cookieless preferred).
- Track button clicks on every CTA with a small wrapper (`onClick={() => track('cta_click', { id })}`).
- Track scroll depth (25/50/75/100%).

---

## 12. Testing Plan

- **Unit:** Vitest + Testing Library — render each section, assert headings/CTAs exist.
- **Smoke:** add a test in `frontend/src/tests/` that renders `LandingPage` and asserts the hero CTA links to `/signup`.
- **Visual:** manual review at breakpoints 320 / 375 / 768 / 1024 / 1440 / 1920.
- **Lighthouse:** run `npm run build && npm run preview`, then Lighthouse → fix any items < 90.
- **Cross-browser:** Chrome, Firefox, Edge, Safari (if available).

---

## 13. Step-by-Step Implementation Order (recommended)

Work in this order so you always have a deployable page:

1. Set up routing — add `/` route showing a placeholder `LandingPage` that just says "Hello".
2. Build `LandingNavbar` + `LandingFooter` (the page frame).
3. Build `Hero` with static content + primary CTA wired to `/signup`.
4. Build `FeaturesGrid` (highest-content section).
5. Build `HowItWorks`.
6. Build `ProblemSection` + `TrustStrip`.
7. Build `DashboardPreview` with a real screenshot.
8. Build `StatsBar`, `PricingTable`/`UseCases`, `FAQAccordion`.
9. Build `FinalCTA`.
10. Polish: motion, gradients, dark-mode contrast pass.
11. Accessibility pass (keyboard + screen reader).
12. Performance pass (lazy-load, image compression, code-split).
13. SEO/meta pass.
14. Tests.
15. Build + Lighthouse + manual cross-browser check.
16. Merge.

---

## 14. Estimated Effort

| Phase                     | Time      |
|---------------------------|-----------|
| Routing + scaffolding     | 0.5 day   |
| Navbar + Footer + Hero    | 1 day     |
| Features + How It Works   | 1 day     |
| Problem + Trust + Preview | 1 day     |
| Stats + Pricing + FAQ     | 1 day     |
| Final CTA + polish        | 0.5 day   |
| A11y + perf + SEO         | 1 day     |
| Testing + QA              | 0.5 day   |
| **Total**                 | **~6.5 days** for one developer |

---

## 15. Out-of-Scope (Phase 2)

- Multi-language (i18n).
- Blog / changelog routes.
- Customer testimonials (none collected yet).
- A/B testing framework.
- Live chat widget.

---

## 16. Definition of Done

- [ ] `/` renders the landing page; logged-out users see it on first visit.
- [ ] All CTAs route correctly to `/signup` or `/login`.
- [ ] Mobile (375px), tablet (768px), and desktop (1440px) all look correct.
- [ ] Lighthouse ≥ 90 on all four categories.
- [ ] All interactive elements keyboard-accessible.
- [ ] No console errors or warnings.
- [ ] Vitest suite passes; new landing smoke test included.
- [ ] Built bundle size for `/` route < 200KB gzipped (excluding shared chunks).
