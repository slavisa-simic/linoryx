# README visuals

The root README starts with one four-slide SVG carousel, with larger desktop artwork and a separate mobile composition. Colors, the logo and Inter fonts come from the project's existing branding. The section titles follow the [profile layout guidelines](https://github.com/slavisa-simic/slavisa-simic/blob/main/docs/ANIMATION_AND_LAYOUT.md) and [title generator](https://github.com/slavisa-simic/slavisa-simic/blob/main/scripts/build_profile_assets.py).

## Files

- `intro.png`, `overview.png`, `integrations.png`, `responsive.png`: 2:1 desktop masters. The original 2:1 project, integrations and device artwork is retained; the red intro was recomposed to match. Matching WebP files are included.
- `*-mobile.png` / `.webp`: dedicated square compositions with larger text and artwork for narrow screens. The responsive and integration sections use these too.
- `header-carousel.svg`: a 1000 × 500 carousel using the same self-contained SVG image-track animation as the [profile README](https://github.com/slavisa-simic/slavisa-simic/blob/main/scripts/build_carousel.py). It fills the README width, starts automatically, holds each slide for four seconds and loops indefinitely. It has position indicators and no playback controls. The red intro is its first slide.
- `header-carousel-mobile.svg`: a 600 × 600 version selected below 601 CSS pixels. The four images are embedded in each SVG.
- `header-carousel-reduced.svg` and `header-carousel-mobile-reduced.svg`: automatically cycle through the same slides using cuts when reduced motion is preferred. They keep cycling continuously.
- `workflow.gif`: highlights the report states in order. `workflow.png` is its static version.
- `*-title.svg` and `*-title-mobile.svg`: all 14 redesigned headings. They use a thin square frame, still Inter lettering and a six-second light sweep along the divider, matching the profile's motion rules. Desktop titles are 1000 × 60; mobile titles are 400 × 54. The PNG baselines are rendered at 3× resolution for crisp lettering, and editable vector sources remain in `source/`.
- `database-schema.png`: overview of all 11 tables, their keys and 16 foreign-key relationships. The linked `database-schema.svg` has every column; `database-schema-full.png` is its raster version. The source folder includes the schema metadata and editable Graphviz files.
- `use-cases.svg` / `.png`: UML diagram with all four roles, seven required includes, three optional extensions and administrator-to-dispatcher inheritance. The source folder includes the model and editable PlantUML file.
- `../captures/`: actual desktop, tablet and phone login screenshots used as references for the device image.

The dashboard numbers are local demo data. The integration image shows Geoapify and Gmail SMTP through Spring Mail. The root README also includes the actual dashboard screenshot. Both the carousel and section titles use SVG animation without playback controls. The report workflow keeps its existing GIF. Matching static files remain available in this folder.

## Rebuild the graphics

Install `sharp`, `gifenc`, `@resvg/resvg-js` and `@viz-js/viz` in a separate tooling directory, then run from the project root:

```powershell
node scripts/build-readme-visuals.mjs path/to/tooling/node_modules
node scripts/build-readme-diagrams.mjs path/to/tooling/node_modules
```

These rebuild the headings, diagrams, workflow animation, WebP versions and SVG carousels from the saved sources. The schema input contains database structure from the local PostgreSQL metadata. Diagram notes and implementation references are in [diagrams.md](diagrams.md).

The image-generation brief and prompts are in [prompts.md](prompts.md).
