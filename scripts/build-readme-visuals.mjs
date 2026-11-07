import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

// Optional tooling stays separate from the application dependencies.
// node scripts/build-readme-visuals.mjs <tooling-directory>/node_modules
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(
  join(resolve(process.argv[2] || root), "package.json"),
);
const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");
const output = join(root, "docs/readme/visuals");
const source = join(output, "source");
await mkdir(source, { recursive: true });

const color = {
  ink: "#1A1A1A",
  accent: "#D05445",
  pale: "#F1E5E0",
  canvas: "#F7F5F2",
  border: "#D6D2CC",
  muted: "#6B6B6B",
  white: "#FFFFFF",
};
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const text = (
  x,
  y,
  value,
  size = 22,
  fill = color.ink,
  weight = 400,
  extra = "",
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${escape(value)}</text>`;
const rect = (
  x,
  y,
  width,
  height,
  fill = color.white,
  radius = 14,
  stroke = color.border,
) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const line = (x1, y1, x2, y2, stroke = color.border, width = 2, extra = "") =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="${width}" fill="none" ${extra}/>`;
const circle = (x, y, radius, fill = color.pale, stroke = "none") =>
  `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const logoSource = await readFile(
  join(root, "linoryx-web/public/brand/linoryx-logo.svg"),
  "utf8",
);
const logo = logoSource.replace(
  /^<svg[^>]*>/,
  '<svg x="1010" y="26" width="140" height="39" viewBox="0 0 452 124">',
);
const arrow = (x, y) =>
  `<path d="M${x} ${y}h26m-8-7 8 7-8 7" fill="none" stroke="${color.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

function frame(title, subtitle, content, height = 330) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-label="${escape(title)}"><rect width="1200" height="${height}" rx="18" fill="${color.canvas}"/><g font-family="Inter, Arial, sans-serif">${logo}${text(48, 76, title, 40, color.ink, 600)}${text(48, 113, subtitle, 21, color.muted)}${line(48, 139, 1152, 139)}${content}</g></svg>`;
}

function person(x, y) {
  return (
    circle(x, y - 9, 8, "none", color.accent) +
    `<path d="M${x - 15} ${y + 17}v-4a15 12 0 0 1 30 0v4" stroke="${color.accent}" stroke-width="2.5" fill="none"/>`
  );
}

const dashboard = frame(
  "Dashboard.",
  "Incident activity, priorities and team workload in one view.",
  rect(48, 166, 220, 122) +
    text(70, 196, "Total incidents", 19, color.muted) +
    text(70, 253, "183", 43, color.ink, 600) +
    rect(286, 166, 220, 122) +
    text(308, 196, "Active incidents", 19, color.muted) +
    text(308, 253, "110", 43, color.ink, 600) +
    rect(524, 166, 360, 122) +
    `<path d="M547 265l31-9 30-43 32 21 34-37 34 18 32-36 34 42 32-13 30 35 26-8" fill="none" stroke="${color.accent}" stroke-width="3"/>` +
    line(546, 269, 859, 269) +
    text(544, 191, "Incident activity", 19, color.muted) +
    rect(902, 166, 250, 122) +
    text(925, 196, "Closure rate", 19, color.muted) +
    text(925, 253, "40%", 43, color.ink, 600),
);

const roles = frame(
  "One team. Clear roles.",
  "The right workspace for each person.",
  [
    ["Customer", "Services & reports"],
    ["Technician", "Assigned repairs"],
    ["Dispatcher", "Incident coordination"],
    ["Administrator", "Accounts & network"],
  ]
    .map(([name, scope], index) => {
      const x = 48 + index * 281;
      return (
        rect(x, 165, 261, 125) +
        person(x + 32, 202) +
        text(x + 60, 202, name, 22, color.ink, 600) +
        text(x + 20, 263, scope, 19, color.muted)
      );
    })
    .join(""),
);

function workflow(active = -1) {
  return frame(
    "From report to repair.",
    "Report. Assign. Resolve. Confirm.",
    [
      ["OPEN", "Customer reports"],
      ["IN_PROGRESS", "Technician works"],
      ["RESOLVED", "Customer confirms"],
      ["CLOSED", "Operator closes"],
    ]
      .map(([name, detail], index) => {
        const x = 48 + index * 283;
        const selected = active === index;
        return (
          rect(
            x,
            174,
            235,
            112,
            selected ? color.pale : color.white,
            14,
            selected ? color.accent : color.border,
          ) +
          circle(x + 25, 199, 5, selected ? color.accent : color.border) +
          text(x + 18, 229, name, 23, color.ink, 600) +
          text(x + 18, 262, detail, 18, color.muted) +
          (index < 3 ? arrow(x + 244, 232) : "")
        );
      })
      .join(""),
  );
}

const architecture = frame(
  "Built on a clear stack.",
  "React on the frontend. Spring Boot behind it. PostgreSQL for data.",
  [
    ["React", "TypeScript + Vite"],
    ["Spring Boot", "Java + REST API"],
    ["PostgreSQL", "Application data"],
  ]
    .map(([name, detail], index) => {
      const x = 48 + index * 386;
      return (
        rect(x, 172, 330, 118) +
        text(x + 24, 216, name, 29, color.ink, 600) +
        text(x + 24, 258, detail, 21, color.muted) +
        (index < 2 ? arrow(x + 343, 230) : "")
      );
    })
    .join(""),
);

const local = frame(
  "Run it locally.",
  "Build the apps, start Docker and open localhost.",
  rect(48, 166, 560, 127) +
    circle(71, 188, 4, color.accent) +
    circle(86, 188, 4, color.border) +
    circle(101, 188, 4, color.border) +
    text(72, 229, "> docker compose up -d", 25, color.ink, 500) +
    text(72, 268, "localhost:8081", 21, color.muted) +
    arrow(631, 231) +
    [
      ["web", "8081"],
      ["api", "8080"],
      ["db", "5433"],
    ]
      .map(([name, port], index) => {
        const x = 694 + index * 157;
        return (
          rect(x, 174, 141, 112) +
          text(x + 18, 213, name, 25, color.ink, 600) +
          text(x + 18, 259, port, 24, color.muted)
        );
      })
      .join(""),
);

const testing = frame(
  "Check the work.",
  "Backend tests, frontend tests, lint and a production build.",
  [
    ["Backend", "mvnw clean verify"],
    ["Frontend", "npm test"],
    ["Code checks", "npm run lint"],
    ["Build", "npm run build"],
  ]
    .map(([title, command], index) => {
      const x = 48 + index * 281;
      return (
        rect(x, 172, 261, 116) +
        `<path d="M${x + 20} 201l6 6 12-14" stroke="${color.accent}" stroke-width="3" fill="none"/>` +
        text(x + 48, 208, title, 23, color.ink, 600) +
        text(x + 19, 259, command, 20, color.muted)
      );
    })
    .join(""),
);

const upgrade = frame(
  "New identity. Same data.",
  "Update the module paths and rebuild the Docker images.",
  rect(48, 173, 398, 112) +
    text(72, 215, "linoryx-api", 28, color.ink, 600) +
    text(72, 259, "linoryx-web", 28, color.ink, 600) +
    arrow(473, 228) +
    rect(534, 173, 280, 112, color.pale) +
    text(558, 216, "Rebuild", 28, color.ink, 600) +
    text(558, 257, "Docker images", 21, color.muted) +
    arrow(837, 228) +
    rect(898, 173, 254, 112) +
    text(921, 216, "Keep", 28, color.ink, 600) +
    text(921, 257, "Database volume", 21, color.muted),
);

const documentation = frame(
  "Find the details.",
  "Small guides for setup, features and the Linoryx brand.",
  [
    ["Brand", "Identity & styles"],
    ["Services", "Network & reports"],
    ["Technicians", "Profiles & assignments"],
    ["Demo data", "Local sample records"],
  ]
    .map(([title, detail], index) => {
      const x = 48 + index * 281;
      return (
        rect(x, 172, 261, 116) +
        `<path d="M${x + 20} 196h17l8 8v26h-25zM${x + 37} 196v9h8" stroke="${color.accent}" stroke-width="2" fill="none"/>` +
        text(x + 60, 218, title, 24, color.ink, 600) +
        text(x + 20, 263, detail, 18, color.muted)
      );
    })
    .join(""),
);

const roadmap = frame(
  "What comes next.",
  "Planned improvements for the project.",
  line(100, 208, 1100, 208, color.border, 3) +
    [
      ["Hosted demo", "Cloud deployment"],
      ["Product tour", "More screenshots & video"],
      ["CI/CD", "Automated checks"],
    ]
      .map(([title, detail], index) => {
        const x = 95 + index * 470;
        return (
          circle(x, 208, 10, color.canvas, color.accent) +
          text(x - 45, 253, title, 26, color.ink, 600) +
          text(x - 45, 287, detail, 19, color.muted)
        );
      })
      .join(""),
);

const diagrams = {
  dashboard,
  roles,
  workflow: workflow(),
  architecture,
  "run-locally": local,
  testing,
  upgrade,
  documentation,
  roadmap,
};
const fontFiles = [
  "Inter-Regular.ttf",
  "Inter-Medium.ttf",
  "Inter-SemiBold.ttf",
  "Inter-Bold.ttf",
].map((name) => join(root, "linoryx-web/public/fonts", name));
const render = (svg, scale = 1) =>
  new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "Inter" },
    fitTo: { mode: "zoom", value: scale },
  })
    .render()
    .asPng();
for (const [name, svg] of Object.entries(diagrams)) {
  await writeFile(join(source, name + ".svg"), svg);
  await writeFile(join(output, name + ".png"), render(svg));
}

// Four state highlights show the real report sequence without browser scripts.
const flowGif = GIFEncoder();
for (let state = 0; state < 4; state++) {
  const pixels = await sharp(render(workflow(state)))
    .flatten({ background: color.white })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const palette = quantize(pixels, 128);
  flowGif.writeFrame(applyPalette(pixels, palette), 1200, 330, {
    palette,
    delay: 1800,
    repeat: 0,
  });
}
flowGif.finish();
await writeFile(join(output, "workflow.gif"), flowGif.bytes());

// Five-slide carousel: four existing slides + Testing.
// Desktop 2:1, mobile 1:1.

const slideNames = [
  "intro",
  "overview",
  "integrations",
  "responsive",
  "testing-showcase",
  "ci-cd-azure",
];

const width = 1000;
const height = 500;
const mobileSize = 600;
const holdMs = 1500;
const transitionMs = 250;
const total = slideNames.length;

async function optimizeImage(name, mobile = false) {
  const suffix = mobile ? "-mobile" : "";
  const input = join(output, `${name}${suffix}.png`);
  const target = join(output, `${name}${suffix}.webp`);

  const metadata = await sharp(input).metadata();
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;

  if (!originalWidth || !originalHeight) {
    throw new Error(`Invalid image: ${input}`);
  }

  const actualRatio = originalWidth / originalHeight;
  const expectedRatio = mobile ? 1 : 2;

  if (Math.abs(actualRatio - expectedRatio) > 0.025) {
    throw new Error(
      `${input}: expected ${mobile ? "1:1" : "2:1"}, ` +
        `got ${originalWidth}x${originalHeight}. ` +
        "Prepare a correctly proportioned image.",
    );
  }

  await sharp(input)
    .resize(mobile ? 900 : 1600, mobile ? 900 : 800, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 88, effort: 5 })
    .toFile(target);

  const encoded = (await readFile(target)).toString("base64");
  return `data:image/webp;base64,${encoded}`;
}

// Carousel artwork
const slideImages = await Promise.all(
  slideNames.map((name) => optimizeImage(name)),
);

const mobileImages = await Promise.all(
  slideNames.map((name) => optimizeImage(name, true)),
);

function headerCarousel(reduced = false, mobile = false) {
  const w = mobile ? mobileSize : width;
  const h = mobile ? mobileSize : height;
  const artwork = mobile ? mobileImages : slideImages;

  const segmentMs = holdMs + (reduced ? 0 : transitionMs);
  const durationMs = total * segmentMs;

  const values = ["0 0"];
  const times = [0];
  const splines = [];

  if (reduced) {
    for (let i = 1; i <= total; i++) {
      values.push(`${-i * w} 0`);
      times.push(i / total);
    }
  } else {
    for (let i = 0; i < total; i++) {
      values.push(`${-i * w} 0`, `${-(i + 1) * w} 0`);

      times.push(
        (i * segmentMs + holdMs) / durationMs,
        ((i + 1) * segmentMs) / durationMs,
      );

      splines.push("0 0 1 1", "0.22 1 0.36 1");
    }
  }

  const precision = (items) =>
    items.map((value) => Number(value.toFixed(8))).join(";");

  const images = [...artwork, artwork[0]]
    .map(
      (uri, index) =>
        `<image href="${uri}" ` +
        `x="${index * w}" y="0" ` +
        `width="${w}" height="${h}" ` +
        `preserveAspectRatio="xMidYMid meet"/>`,
    )
    .join("");

  const motion =
    `<animateTransform ` +
    `attributeName="transform" ` +
    `type="translate" ` +
    `begin="0s" ` +
    `values="${values.join(";")}" ` +
    `keyTimes="${precision(times)}" ` +
    (reduced
      ? `calcMode="discrete"`
      : `calcMode="spline" keySplines="${splines.join(";")}"`) +
    ` dur="${durationMs / 1000}s" ` +
    `repeatCount="indefinite"/>`;

  // Indicator timing, automatically derived from slide count
  const switches = reduced
    ? Array.from({ length: total + 1 }, (_, i) => i / total)
    : [
        0,
        ...Array.from(
          { length: total },
          (_, i) => (i * segmentMs + holdMs + transitionMs / 2) / durationMs,
        ),
        1,
      ];

  // Exact centering for any number of slides
  const centre = w / 2 - ((total - 1) * 26) / 2;

  const indicators = slideNames
    .map((_, index) => {
      const states = reduced
        ? Array.from({ length: total + 1 }, (_, i) =>
            Number(i % total === index),
          )
        : [
            Number(index === 0),
            ...Array.from({ length: total }, (_, i) =>
              Number((i + 1) % total === index),
            ),
            Number(index === 0),
          ];

      const cx = centre + index * 26;
      const indicatorY = h - 28;

      return (
        `<circle cx="${cx}" cy="${indicatorY}" r="3" fill="#B7ABA3"/>` +
        `<rect x="${cx - 8}" y="${indicatorY - 4}" width="16" height="8" rx="4" fill="#1A1A1A" opacity="${states[0]}">` +
        `<animate attributeName="opacity" values="${states.join(";")}" keyTimes="${precision(switches)}" calcMode="discrete" dur="${durationMs / 1000}s" repeatCount="indefinite"/>` +
        `</rect>`
      );
    })
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${w}" height="${h}" ` +
    `viewBox="0 0 ${w} ${h}" role="img">` +
    `<title>Linoryx product carousel</title>` +
    `<desc>Six slides: introduction, overview, integrations, ` +
    `responsive design, automated testing and planned CI/CD.</desc>` +
    `<defs><clipPath id="carousel-frame">` +
    `<rect width="${w}" height="${h}"/>` +
    `</clipPath></defs>` +
    `<g clip-path="url(#carousel-frame)">` +
    `<g>${images}${motion}</g></g>` +
    `${indicators}</svg>\n`
  );
}

// Four output versions
await Promise.all([
  writeFile(join(output, "header-carousel.svg"), headerCarousel()),
  writeFile(join(output, "header-carousel-reduced.svg"), headerCarousel(true)),
  writeFile(
    join(output, "header-carousel-mobile.svg"),
    headerCarousel(false, true),
  ),
  writeFile(
    join(output, "header-carousel-mobile-reduced.svg"),
    headerCarousel(true, true),
  ),
]);

// Carousel manifest
await writeFile(
  join(source, "header-carousel.json"),
  JSON.stringify(
    {
      format: "svg",
      animation: "SMIL",
      width,
      height,
      mobile: {
        width: mobileSize,
        height: mobileSize,
      },
      holdMs,
      transitionMs,
      durationMs: total * (holdMs + transitionMs),
      transition: "slide-left",
      repeat: "indefinite",
      controls: false,
      slides: slideNames,
    },
    null,
    2,
  ) + "\n",
);

const sections = [
  ["key-capabilities", "Key capabilities"],
  ["system-architecture", "System architecture"],
  ["database-schema", "Database schema"],
  ["report-lifecycle", "Report lifecycle"],
  ["testing", "Testing"],
  ["ci-cd-azure", "Planned CI/CD & Azure"],
  ["tech-stack", "Tech stack"],
  ["run-locally", "Run locally"],
];

function linoryxSectionMotif(name) {
  const white = "#F7F5F2";

  const path = (d) =>
    `<path d="${d}" fill="none" stroke="${white}"
      stroke-width="1.7" stroke-opacity=".48"
      stroke-linecap="round" stroke-linejoin="round"/>`;

  const pulse = (d, delay = 0) => `
    <path d="${d}" fill="none" stroke="#FFFFFF"
      stroke-width="2.8" stroke-linecap="round"
      stroke-dasharray="15 360">
      <animate attributeName="stroke-dashoffset"
        from="25" to="-360" dur="3.6s"
        begin="${delay}s" repeatCount="indefinite"/>
    </path>`;

  const dot = (x, y, r = 3) =>
    `<circle cx="${x}" cy="${y}" r="${r}"
      fill="${white}" opacity=".7"/>`;

  const blink = (x, y, delay = 0, r = 4) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="#FFFFFF">
      <animate attributeName="opacity"
        values=".15;1;.15" dur="3s"
        begin="${delay}s" repeatCount="indefinite"/>
    </circle>`;

  switch (name) {
    case "system-architecture": {
      const routes = [
        "M10 18H78L105 45H230",
        "M10 50H92L118 76H230",
        "M10 82H66L115 33H230",
      ];

      return {
        staticArt:
          routes.map(path).join("") +
          [
            [78, 18],
            [105, 45],
            [92, 50],
            [118, 76],
            [66, 82],
            [115, 33],
          ]
            .map(([x, y]) => dot(x, y))
            .join(""),
        motionArt: routes.map((d, i) => pulse(d, i * 0.55)).join(""),
      };
    }

    case "database-schema": {
      const cells = [];
      const animated = [];

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const x = 18 + col * 54;
          const y = 15 + row * 30;

          cells.push(`
            <rect x="${x}" y="${y}" width="34" height="19"
              rx="4" fill="${white}" fill-opacity=".07"
              stroke="${white}" stroke-opacity=".55"/>`);

          animated.push(`
            <rect x="${x}" y="${y}" width="34" height="19"
              rx="4" fill="#FFFFFF" opacity=".05">
              <animate attributeName="opacity"
                values=".05;.48;.05" dur="3.8s"
                begin="${(col * 0.32 + row * 0.4).toFixed(2)}s"
                repeatCount="indefinite"/>
            </rect>`);
        }
      }

      return {
        staticArt: cells.join(""),
        motionArt: animated.join(""),
      };
    }

    case "report-lifecycle": {
      const route = "M20 74L66 50L110 62L159 25L216 41";
      const points = [
        [20, 74],
        [66, 50],
        [110, 62],
        [159, 25],
        [216, 41],
      ];

      return {
        staticArt: path(route) + points.map(([x, y]) => dot(x, y, 4)).join(""),
        motionArt:
          pulse(route) +
          points.map(([x, y], i) => blink(x, y, i * 0.45, 4)).join(""),
      };
    }

    case "testing": {
      const cx = 130;
      const cy = 50;
      const particles = Array.from({ length: 15 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 15;
        return [
          cx + Math.cos(angle) * (22 + (i % 3) * 7),
          cy + Math.sin(angle) * (22 + (i % 3) * 7),
        ];
      });

      return {
        staticArt: `
          <circle cx="${cx}" cy="${cy}" r="39"
            fill="none" stroke="${white}" stroke-opacity=".38"
            stroke-width="1.5"/>
          ${particles.map(([x, y]) => dot(x, y, 1.5)).join("")}
        `,
        motionArt: `
          <circle cx="${cx}" cy="${cy}" r="39"
            fill="none" stroke="#FFFFFF" stroke-width="3"
            stroke-dasharray="36 210" stroke-linecap="round">
            <animateTransform attributeName="transform"
              type="rotate" from="0 130 50" to="360 130 50"
              dur="5s" repeatCount="indefinite"/>
          </circle>
          ${particles
            .slice(0, 8)
            .map(([x, y], i) => blink(x, y, i * 0.33, 2))
            .join("")}
        `,
      };
    }

    case "ci-cd-azure": {
      const boxes = [
        [10, 55],
        [66, 42],
        [122, 29],
        [178, 16],
      ];

      const connectors = ["M53 68L66 55", "M109 55L122 42", "M165 42L178 29"];

      return {
        staticArt: `
          ${connectors.map(path).join("")}
          ${boxes
            .map(
              ([x, y]) => `
            <rect x="${x}" y="${y}" width="43" height="26"
              rx="5" fill="${white}" fill-opacity=".06"
              stroke="${white}" stroke-opacity=".6"/>
          `,
            )
            .join("")}
        `,
        motionArt: `
          ${connectors.map((d, i) => pulse(d, i * 0.6)).join("")}
          ${boxes
            .map(
              ([x, y], i) => `
            <rect x="${x}" y="${y}" width="43" height="26"
              rx="5" fill="#FFFFFF" opacity=".05">
              <animate attributeName="opacity"
                values=".05;.3;.05" dur="3.6s"
                begin="${i * 0.6}s" repeatCount="indefinite"/>
            </rect>
          `,
            )
            .join("")}
        `,
      };
    }

    case "tech-stack": {
      const levels = [16, 41, 66];

      return {
        staticArt: levels
          .map(
            (y) => `
          <path d="M46 ${y}H157L190 ${y + 17}H79Z"
            fill="${white}" fill-opacity=".07"
            stroke="${white}" stroke-opacity=".55"
            stroke-width="1.5" stroke-linejoin="round"/>
        `,
          )
          .join(""),
        motionArt: levels
          .map(
            (y, i) => `
          <path d="M46 ${y}H157L190 ${y + 17}"
            fill="none" stroke="#FFFFFF" stroke-width="2.3"
            stroke-dasharray="18 240" stroke-linecap="round">
            <animate attributeName="stroke-dashoffset"
              from="20" to="-240" dur="3.8s"
              begin="${i * 0.6}s" repeatCount="indefinite"/>
          </path>
        `,
          )
          .join(""),
      };
    }

    case "run-locally": {
      return {
        staticArt: `
          <rect x="23" y="15" width="168" height="72"
            rx="9" fill="${white}" fill-opacity=".06"
            stroke="${white}" stroke-opacity=".6"/>
          <path d="M23 33H191" stroke="${white}" opacity=".4"/>
          ${[36, 47, 58].map((x) => dot(x, 24, 2)).join("")}
          ${path("M39 47L50 55L39 63")}
          ${path("M59 63H88")}
        `,
        motionArt: `
          <rect x="92" y="55" width="3" height="12"
            rx="1" fill="#FFFFFF">
            <animate attributeName="opacity"
              values="1;0;1" dur="1s"
              repeatCount="indefinite"/>
          </rect>
          ${[205, 217, 229]
            .map(
              (x, i) => `
            <rect x="${x}" y="-12" width="2"
              height="${15 + i * 6}" rx="1" fill="#FFFFFF"
              opacity=".65">
              <animate attributeName="y" from="-30" to="100"
                dur="${2.4 + i * 0.5}s" begin="${i * 0.5}s"
                repeatCount="indefinite"/>
            </rect>
          `,
            )
            .join("")}
        `,
      };
    }

    default:
      return { staticArt: "", motionArt: "" };
  }
}

async function linoryxOtherTitle(title, mobile, name) {
  const w = mobile ? 400 : 1000;
  const h = mobile ? 88 : 108;
  const padding = mobile ? 19 : 38;
  const fontSize = mobile ? 21 : 36;

  const artX = mobile ? 248 : 728;
  const artY = mobile ? 17 : 8;
  const scale = mobile ? 0.55 : 1;

  const motif = linoryxSectionMotif(name);

  // Prevent the longest title from overlapping the mobile artwork.
  const labels =
    mobile && name === "ci-cd-azure" ? ["Planned CI/CD", "& Azure"] : [title];

  const labelSvg = labels
    .map((label, i) => {
      const y = labels.length === 2 ? 39 + i * 25 : h / 2 + (mobile ? 8 : 13);

      return text(padding, y, label, fontSize, "#F7F5F2", 600);
    })
    .join("");

  const transform = `translate(${artX} ${artY}) scale(${scale})`;

  const baseline = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}"
        rx="12" fill="#D05445"/>
      <path d="M${artX - 28} 0H${w}V${h}H${artX - 66}Z"
        fill="#A83E32" opacity=".36"/>
      <g font-family="Inter, Arial, sans-serif">
        ${labelSvg}
      </g>
      <g transform="${transform}">
        ${motif.staticArt}
      </g>
    </svg>`;

  const png = render(baseline, 3);
  const image = "data:image/png;base64," + Buffer.from(png).toString("base64");

  const animated = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
      role="img" aria-label="${escape(title)}">
      <title>${escape(title)}</title>
      <defs>
        <clipPath id="banner-crop">
          <rect width="${w}" height="${h}" rx="12"/>
        </clipPath>
      </defs>
      <g clip-path="url(#banner-crop)">
        <image href="${image}" width="${w}" height="${h}"/>
        <g transform="${transform}">
          ${motif.motionArt}
        </g>
      </g>
    </svg>`;

  return {
    baseline,
    animated,
    png,
    width: w,
    height: h,
    fontSize,
    dividerStart: 0,
    dividerEnd: 0,
  };
}

async function linoryxTitleGraphic(title, mobile) {
  const w = mobile ? 400 : 1000;
  const h = mobile ? 88 : 108;
  const padding = mobile ? 19 : 38;
  const fontSize = mobile ? 21 : 36;

  // Compact diagonal network motif on the right
  const artX = mobile ? 248 : 728;
  const artY = mobile ? 17 : 8;
  const scale = mobile ? 0.55 : 1;

  const mainPath = "M6 75L65 16L118 69L174 13L225 64";
  const secondaryPath = "M42 91L102 31L154 83L214 23";

  const nodes = [
    [65, 16],
    [118, 69],
    [174, 13],
    [214, 23],
  ];

  const staticArt = `
    <g transform="translate(${artX} ${artY}) scale(${scale})"
       fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="${mainPath}" stroke="#F7F5F2"
            stroke-width="1.5" opacity=".45"/>
      <path d="${secondaryPath}" stroke="#F7F5F2"
            stroke-width="1.2" opacity=".22"/>
      ${nodes
        .map(
          ([x, y]) =>
            `<circle cx="${x}" cy="${y}" r="3"
           fill="#F7F5F2" stroke="none" opacity=".65"/>`,
        )
        .join("")}
    </g>`;

  // Text is rendered using the Inter font from Linoryx.
  const baseline = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect width="${w}" height="${h}" rx="12" fill="#D05445"/>
      <path d="M${artX - 28} 0H${w}V${h}H${artX - 66}Z"
            fill="#A83E32" opacity=".36"/>
      <g font-family="Inter, Arial, sans-serif">
        ${text(
          padding,
          h / 2 + (mobile ? 8 : 13),
          title,
          fontSize,
          "#F7F5F2",
          600,
        )}
      </g>
      ${staticArt}
    </svg>`;

  // Embed rendered text so GitHub displays the correct font.
  const png = render(baseline, 3);
  const image = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;

  const animatedNodes = nodes
    .map(
      ([x, y], i) => `
    <circle cx="${x}" cy="${y}" r="3" fill="#FFFFFF"
            opacity=".45">
      <animate attributeName="opacity"
               values=".3;1;.3"
               dur="3.6s"
               begin="${i * 0.6}s"
               repeatCount="indefinite"/>
      <animate attributeName="r"
               values="3;4.8;3"
               dur="3.6s"
               begin="${i * 0.6}s"
               repeatCount="indefinite"/>
    </circle>`,
    )
    .join("");

  const animated = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
         role="img" aria-label="${escape(title)}">
      <title>${escape(title)}</title>

      <defs>
        <clipPath id="banner-crop">
          <rect width="${w}" height="${h}" rx="12"/>
        </clipPath>
      </defs>

      <g clip-path="url(#banner-crop)">
        <image href="${image}" width="${w}" height="${h}"/>

        <g transform="translate(${artX} ${artY}) scale(${scale})"
           fill="none" stroke-linecap="round">

          <path d="${mainPath}"
                stroke="#FFFFFF"
                stroke-width="2.5"
                stroke-dasharray="16 340"
                opacity=".95">
            <animate attributeName="stroke-dashoffset"
                     from="30" to="-340"
                     dur="3.6s"
                     repeatCount="indefinite"/>
          </path>

          ${animatedNodes}
        </g>
      </g>
    </svg>`;

  return {
    baseline,
    animated,
    png,
    width: w,
    height: h,
    fontSize,
    dividerStart: 0,
    dividerEnd: 0,
  };
}

const titleManifest = [];
for (const [name, title] of sections) {
  for (const mobile of [false, true]) {
    const asset =
      name === "key-capabilities"
        ? await linoryxTitleGraphic(title, mobile)
        : await linoryxOtherTitle(title, mobile, name);
    const suffix = mobile ? "-mobile" : "";
    await writeFile(
      join(source, name + "-title" + suffix + ".svg"),
      asset.baseline + "\n",
    );
    await writeFile(
      join(output, name + "-title" + suffix + ".svg"),
      asset.animated,
    );
    if (!mobile) await writeFile(join(output, name + "-title.png"), asset.png);
    titleManifest.push({
      name,
      title,
      mobile,
      width: asset.width,
      height: asset.height,
      fontSize: asset.fontSize,
      dividerStart: asset.dividerStart,
      dividerEnd: asset.dividerEnd,
    });
  }
}
await writeFile(
  join(source, "section-titles.json"),
  JSON.stringify(
    {
      reference:
        "https://github.com/slavisa-simic/slavisa-simic/blob/main/scripts/build_profile_assets.py",
      durationMs: 6000,
      titles: titleManifest,
    },
    null,
    2,
  ) + "\n",
);
console.log("Generated 6 carousel slides and 8 animated section headings.");
