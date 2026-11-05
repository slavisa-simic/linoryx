# Vigil frontend design

This pass follows [unslop by Damir Sokolovsky (@heydamir)](https://heydamir.design/unslop), licensed under CC BY 4.0.

## Direction

- Product: an operational workspace for customer reports, incidents and technician assignments
- Character: calm, precise, readable
- World: an incident desk, with neutral surfaces and Vigil's existing blue brand accent
- Moments: the incident activity chart and statuses that need attention
- Signature: small status marks beside incident and report states

## Initial audit

- `workspace.css`: four saturated metric backgrounds compete with the data
- `workspace.css`: navigation becomes crowded as role-specific links are added
- `workspace.css`: table references use 9px text and badges use 10px text
- `workspace.css`: spacing varies between similar controls, panel headings and rows
- `Dashboard.css`: supporting charts compete with the primary activity chart
- `Dashboard.css`: small text uses negative letter spacing in several numeric summaries
- `Reports.css`: filters, selection controls and checkboxes use inconsistent spacing
- `index.css`: hidden scrollbars obscure horizontal scrolling in wide tables
- `App.css`: the auth card has a looping animation; preserved at the user's explicit request

The existing logo, local Outfit font, page structure and Lucide icons already provide a usable foundation. They remain in place.

## Nine passes

1. Spacing: page gutters, panel padding, filters and form groups follow a shared 4px rhythm. Desktop navigation uses a 240px side column.
2. Color: white panels sit on a neutral background. Blue marks actions, selections and the primary chart. Critical values and workflow statuses retain semantic colors.
3. Icons: the existing Lucide set uses a consistent 1.5 stroke. Decorative metric icons are removed; the component keeps its existing props so callers stay compatible.
4. Copy: short contextual descriptions explain the dashboard, incident list and account management. Existing action labels and workflow wording remain intact.
5. Type: Outfit stays local. Table text and badges become more readable; references and chart axes use a system monospace font. Numbers use tabular figures.
6. Layout: existing sections keep their order. Desktop navigation moves to the side through CSS; smaller screens retain visible links above the content. Tables scroll within their panels.
7. Details: quieter borders, consistent control radii, visible keyboard focus and scrollbars clarify interaction. Report selection controls and filters share the same visual rules.
8. Visuals: existing charts and real application content carry the visual emphasis. No generated images, avatars, sample records or new dependencies are added to the application.
9. Motion: interface feedback uses short color and background transitions. The original auth card animation is preserved as requested; workspace controls respect reduced motion.

## Preserved behavior

API calls, business rules, permissions, routing, form validation and state handling stay unchanged. The original auth cards retain their markup, colors, dimensions, typography, rotation, outlines, live form preview and animation. No user profile images or upload controls are introduced.

Changes stay in the existing CSS files and simple presentation markup. No new component architecture or styling framework is introduced.

## Validation

- Production build passes; Vite still reports the large application and PDF bundles
- Oxlint passes
- All 63 existing frontend tests pass across five test files
- Browser checks cover navigation, incident search, incident dialog opening and closing, chart periods and legend toggles
- Eleven role/page combinations fit within 1440, 1024, 768, 390 and 320px viewports; wide tables retain their own horizontal scrolling
- Original and updated auth card styles were compared for colors, dimensions, typography, transforms and animation
- Visual checks use temporary API fixtures outside the repository because a local backend was not running; no fixture data is included in the application
