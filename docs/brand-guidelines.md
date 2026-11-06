# Linoryx brand and light-only design system

The approved identity is **Linoryx — Telecom Operations Platform**. The attached reference is the basis for the geometric interlocking ribbon symbol, Inter wordmark and restrained enterprise interface. There are no alternate palettes or themes.

## Color and typography

| Token | Approved value | Role |
| --- | --- | --- |
| `--brand-charcoal` | `#1A1A1A` | Primary text, icons and logo |
| `--brand-terracotta` | `#D05445` | Logo and visual brand accents |
| `--brand-ivory` | `#F7F5F2` | Application canvas and secondary surfaces |
| `--brand-warm-gray` | `#D6D2CC` | Supporting borders, neutral chart segment |
| `--brand-muted` | `#6B6B6B` | Supporting text |

[tokens.css](../linoryx-web/src/tokens.css) is the single source of UI color definitions. It also holds spacing, radii, typography, focus, shadow, semantic-status and component tokens. Component styles use aliases instead of copying palette values. Standalone SVG/PNG assets and browser metadata embed the approved colors because they must render independently of application CSS.

Use Inter Regular (400), Medium (500), Semibold (600) and Bold (700). The web font is self-hosted; PDF exports use the supplied static TTF files. Numbers use tabular figures. The font license is included in `linoryx-web/public/fonts/Inter-LICENSE.txt`; font files come from the official [Inter 4.1 release](https://github.com/rsms/inter/releases/tag/v4.1).

## Contrast and semantics

The exact terracotta with white text measures 4.17:1 and is reserved for marks and graphical accents. Normal button text uses white on derived terracotta `#B74335` (5.43:1); hover uses `#A83E32` (6.18:1). Links and selected navigation use the darker ink tone. Charcoal on ivory is 15.99:1; muted text on ivory is 4.90:1.

Success remains green, warning amber, errors red and information blue. These colors describe operational meaning; they do not replace the approved brand palette. Status labels and icons accompany the colors. Form boundaries and focus rings meet the 3:1 non-text contrast threshold.

Run `npm.cmd run check:brand` from `linoryx-web` to verify the 22 defined text, control and chart contrast pairs against the current tokens. This checks those pairs, not every possible accessibility requirement.

## Assets

| Asset | Purpose |
| --- | --- |
| `public/brand/linoryx-logo.svg` | Horizontal mark and outlined Inter wordmark; no external font dependency |
| `public/brand/linoryx-symbol.svg` | Standalone two-ribbon geometric symbol |
| `public/favicon.svg` | SVG browser favicon on ivory |
| `public/brand/app-icon-180.png` | Apple touch icon |
| `public/brand/app-icon-192.png`, `app-icon-512.png` | Web manifest app icons |
| `public/brand/social-preview.svg`, `social-preview.png` | 1200 × 630 social preview |

Paths above are relative to `linoryx-web`. Keep the mark's proportions and clear space, pair charcoal with terracotta, and use a white or warm ivory background. The shared BrandLogo component combines the SVG symbol with the self-hosted Inter wordmark. No alternate-theme logo assets are included.

## Light-only behavior

The document metadata and central stylesheet both request `only light`. Native inputs, selects and textareas use the same scheme. There is no theme provider, toggle, theme persistence or `prefers-color-scheme` branch. Operating-system preferences do not select another palette. Reduced-motion support is independent of color mode.

The application uses light navigation, white panels and ivory backgrounds. Charcoal is limited to text, icons and small controls. Charts use flat fills. Authentication has a red artwork panel and a warm SVG access card based on the supplied reference, with a continuous, gentle six-second vertical float. This decorative panel does not introduce another color scheme.

## Compatibility identifiers deliberately retained

| Identifier | Reason |
| --- | --- |
| Compose project `vigil` and resulting `vigil_postgres_data` volume/container prefix | Reuses the existing PostgreSQL volume on rebuild or restart. Images are now `linoryx-api:local` and `linoryx-web:local`. |
| PostgreSQL database `vigil_db` and user `vigil_api_user` | Preserves existing data, ownership and secrets configuration. |
| JWT issuer `vigil-api` in JwtService/JwtConfig | Preserves signed-token protocol compatibility without changing authentication rules. Public API routes and security validation are unchanged. |
| `vigil.session` as a read-once migration key, and associated regression fixtures | Valid sessions migrate to `linoryx.session`; logout clears both. Tokens and roles are retained. |
| `demo.vigil.test`, the existing demo password and `vigil-demo-v1` advisory lock | Keeps seeded accounts usable and reseeding idempotent; no account credentials or records are rewritten. See [demo data](demo-data.md). |
| Historical `VIGIL 2.0` SQL comment | The existing migration file is preserved byte-for-byte. |
| Existing checkout directory and Git remote/history | No repository or history rename was requested. |

Modules and Maven artifacts are renamed to `linoryx-api` / `linoryx-web`; all Java source and tests use `com.linoryx.api`. Swagger, emails, document titles, downloads and documentation use Linoryx. No database table, API route, audit record, persisted enum or migration was renamed for appearance.
