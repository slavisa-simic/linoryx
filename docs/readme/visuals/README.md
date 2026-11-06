# README visuals

The root README starts with one compact four-slide carousel. Colors, the logo and Inter fonts come from the project's existing branding.

## Files

- `intro.png`, `overview.png`, `integrations.png`, `responsive.png`: matching 3:1 slides made with the built-in image-generation tool. The red intro uses the login/register artwork, logo and telecom illustration. The following slides show the full-stack project, integrations and responsive design. Matching WebP files are also included.
- `header-carousel.gif`: one 1200 × 400 carousel with a four-second hold per slide, short horizontal slide transitions and four position indicators. The red intro is its first slide. It loops automatically without JavaScript. There are no added footers or separate intro banner.
- `workflow.gif`: highlights the report states in order. `workflow.png` is its static version.
- `*-title.gif`: animated headings for all 14 sections. Each has a matching static PNG and editable SVG source.
- `database-schema.png`: overview of all 11 tables, their keys and 16 foreign-key relationships. The linked `database-schema.svg` has every column; `database-schema-full.png` is its raster version. The source folder includes the schema metadata and editable Graphviz files.
- `use-cases.svg` / `.png`: UML diagram with all four roles, seven required includes, three optional extensions and administrator-to-dispatcher inheritance. The source folder includes the model and editable PlantUML file.
- `../captures/`: actual desktop, tablet and phone login screenshots used as references for the device image.

The dashboard numbers are local demo data. The integration image shows Geoapify and Gmail SMTP through Spring Mail. The root README also includes the actual dashboard screenshot. The carousel, headings and workflow embed their GIFs directly so the requested animations play. Matching static files remain available in this folder.

## Rebuild the graphics

Install `sharp`, `gifenc`, `@resvg/resvg-js` and `@viz-js/viz` in a separate tooling directory, then run from the project root:

```powershell
node scripts/build-readme-visuals.mjs path/to/tooling/node_modules
node scripts/build-readme-diagrams.mjs path/to/tooling/node_modules
```

These rebuild the headings, diagrams, workflow animation, WebP versions and header GIF from the saved sources. The schema input contains database structure from the local PostgreSQL metadata. Diagram notes and implementation references are in [diagrams.md](diagrams.md).

The image-generation brief and prompts are in [prompts.md](prompts.md).
