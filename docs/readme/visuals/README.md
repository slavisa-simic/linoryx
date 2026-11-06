# README visuals

The root README uses three project images, a rotating GIF header, animated section titles and technical diagrams. Colors, the logo and Inter fonts come from the project's existing branding.

## Files

- `overview.png`, `integrations.png`, `responsive.png`: project images made with the built-in image-generation tool. The matching WebP files are the smaller README versions. There are no added footers.
- `header-carousel.gif`: three slides with a 3.5-second hold and short crossfades. It loops automatically without JavaScript.
- `workflow.gif`: highlights the report states in order. `workflow.png` is its static version.
- `*-title.gif`: animated headings for all 14 sections. Each has a matching static PNG and editable SVG source.
- `database-schema.png`: overview of all 11 tables, their keys and 16 foreign-key relationships. The linked `database-schema.svg` has every column; `database-schema-full.png` is its raster version. The source folder includes the schema metadata and editable Graphviz files.
- `use-cases.svg` / `.png`: UML diagram with all four roles, seven required includes, three optional extensions and administrator-to-dispatcher inheritance. The source folder includes the model and editable PlantUML file.
- `../captures/`: actual desktop, tablet and phone login screenshots used as references for the device image.

The dashboard numbers are local demo data. The integration image shows Geoapify and Gmail SMTP through Spring Mail. The root README also includes the actual dashboard screenshot. Animated headings, the header and workflow have static images for readers who request reduced motion, when supported by their Markdown viewer.

## Rebuild the graphics

Install `sharp`, `gifenc`, `@resvg/resvg-js` and `@viz-js/viz` in a separate tooling directory, then run from the project root:

```powershell
node scripts/build-readme-visuals.mjs path/to/tooling/node_modules
node scripts/build-readme-diagrams.mjs path/to/tooling/node_modules
```

These rebuild the headings, diagrams, workflow animation, WebP versions and header GIF from the saved sources. The schema input contains database structure from the local PostgreSQL metadata. Diagram notes and implementation references are in [diagrams.md](diagrams.md).

The image-generation brief and prompts are in [prompts.md](prompts.md).
