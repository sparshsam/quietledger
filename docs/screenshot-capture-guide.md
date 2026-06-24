# OpenLedger — Screenshot Capture Guide

> **Last updated:** June 21, 2026 (v0.5.3)
>
> Use `?screenshots=true` on the deployed site to load enriched demo data.
> Screenshot demo data is clearly labeled and never persists to localStorage.

---

## Tooling

For consistent results, use browser DevTools device emulation or a dedicated capture tool:

| Tool | Notes |
|------|-------|
| **Chrome DevTools** | Device toolbar, responsive mode, screenshot capture (full or area) |
| **Firefox DevTools** | Responsive design mode, screenshot command |
| **Safari Web Inspector** | Responsive design mode — useful for iOS app store screenshots |
| **Puppeteer / Playwright** | Scripted headless captures for CI pipelines |
| **macOS + iOS Simulator** | For Apple App Store screenshots at native resolutions |

**Loading screenshot data:** Append `?screenshots=true` to the URL before capturing.

---

## Web / PWA

The PWA manifest and metadata use the same deployment. Screenshots are listed in the manifest for PWA install prompts.

| Size | Requirement | Purpose |
|------|------------|---------|
| **1440×1000** | PNG, < 5 MB | Desktop PWA screenshot (`form_factor: wide`) |
| **390×900** | PNG, < 5 MB | Mobile PWA screenshot (`form_factor: narrow`) |
| 1200×630 | PNG, < 5 MB | Social share / Open Graph (used in Twitter card) |

**Manifest references:**
- `public/manifest.webmanifest` — `screenshots[]` entries
- `src/app/layout.tsx` — Open Graph `images[]`

---

## Apple App Store (iOS)

Apple requires the following screenshot sizes. Text must be legible — avoid dense tables at small sizes.

| Device | Size | Orientation | Screens Needed |
|--------|------|------------|----------------|
| **iPhone 6.7"** (Pro Max) | **1290×2796** | Portrait | 3–5 screens |
| **iPhone 6.5"** (Pro) | 1242×2688 | Portrait | 3–5 screens (fallback) |
| **iPhone 5.5"** (Plus) | 1242×2208 | Portrait | 3–5 screens (fallback) |
| **iPad Pro 12.9"** | **2048×2732** | Portrait or landscape | 3–5 screens |
| **iPad Pro 11"** | 1668×2388 (portrait) / 2388×1668 (landscape) | Either | 3–5 screens (fallback) |

**Recommended captures for Apple:**

| # | Screen | Device |
|---|--------|--------|
| 1 | Dashboard — summary + charts | iPhone 6.7" + iPad 12.9" |
| 2 | Budgets — with progress bars | iPhone 6.7" + iPad 12.9" |
| 3 | Goals — with target tracking | iPhone 6.7" + iPad 12.9" |
| 4 | Transactions — filtered list | iPhone 6.7" + iPad 12.9" |
| 5 | Data management — export options | iPhone 6.7" |

**Technical requirements:**
- PNG or JPEG format
- No alpha/transparency channel
- No device frame overlays by default (Apple adds them)
- 72 DPI minimum
- RGB color space

---

## Google Play Store (Android)

| Device | Size | Screens Needed |
|--------|------|----------------|
| **Phone** | **1080×1920** (or any 16:9 ratio) | At least **8** screenshots |
| **Tablet** | 1280×800 (or 1920×1080 in landscape) | 3–5 screenshots (optional but recommended) |
| 7" tablet | 1200×1920 or 1920×1200 | 3–5 screenshots |

**Minimum 8 phone screenshots required.** Recommended sequence:

| # | Screen | Notes |
|---|--------|-------|
| 1 | Dashboard | Full summary view |
| 2 | Transactions | Filtered list |
| 3 | Add transaction | Form with data filled |
| 4 | Budgets | Progress bars visible |
| 5 | Goals | Tracking targets |
| 6 | CSV import | Mapping screen |
| 7 | Data management | Export/delete options |
| 8 | Privacy / support | Static page |

**Technical requirements:**
- PNG or JPEG, 24-bit, no alpha
- 2–8 MB per image recommended
- 16:9 or 9:16 aspect ratio preferred
- Landscape screenshots must still be submitted in portrait store listing (they auto-rotate)

---

## Microsoft Store

| Size | Requirement | Screens Needed |
|------|------------|----------------|
| **1366×768** | Minimum, PNG, < 2 MB | At least **1** (recommend 3–5) |
| **1920×1080** | Preferred, PNG, < 2 MB | Recommended |

Microsoft Store accepts screenshots of the PWA running in Edge or Chrome. Use the responsive design mode at 1366×768 or 1920×1080.

---

## Automation (Optional)

For scripted capture, a Playwright script can navigate the app with `?screenshots=true` and capture all views:

```ts
import { chromium } from "playwright";

const baseUrl = "https://openledgerbysparsh.vercel.app?ss=true";
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 390, height: 900 };

async function capture() {
  const browser = await chromium.launch();

  // Desktop captures
  const desktopPage = await browser.newPage({ viewport: desktop });
  await desktopPage.goto(baseUrl);
  await desktopPage.screenshot({ path: "screenshots/desktop-dashboard.png", fullPage: false });

  // Click budgets nav item and wait for render
  await desktopPage.click("text=Budgets");
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: "screenshots/desktop-budgets.png" });

  // ... additional captures

  // Mobile captures
  const mobilePage = await browser.newPage({ viewport: mobile });
  await mobilePage.goto(baseUrl);
  await mobilePage.screenshot({ path: "screenshots/mobile-dashboard.png" });

  await browser.close();
}
capture();
```

---

## Checklist Before Capture

- [ ] App is running the **latest v0.5.x build** on Vercel production
- [ ] Error boundary and empty states are triggered and captured
- [ ] Loading states are captured (network throttling in DevTools)
- [ ] Fonts and icons are loaded (no FOUT/FOIT in screenshots)
- [ ] Screenshots are in the correct format (PNG, no alpha)
- [ ] Screenshots have descriptive, consistent filenames
- [ ] Screenshot labels match the store listing text
- [ ] No browser chrome, bookmarks bar, or extensions visible in captures
