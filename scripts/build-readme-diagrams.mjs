import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(
  join(resolve(process.argv[2] || root), "package.json"),
);
const { Resvg } = require("@resvg/resvg-js");
const output = join(root, "docs/readme/visuals");
const source = join(output, "source");
const fonts = ["Inter-Regular.ttf", "Inter-SemiBold.ttf"].map((name) =>
  join(root, "linoryx-web/public/fonts", name),
);
const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const snapshot = JSON.parse(
  await readFile(join(source, "database-schema.json"), "utf8"),
);
const typeName = (type) =>
  ({
    "character varying": "varchar",
    "timestamp without time zone": "timestamp",
  })[type] || type;
const keysFor = (table, kind) =>
  snapshot.keys
    .filter((key) => key.table_name === table && key.constraint_type === kind)
    .flatMap((key) => key.columns);

function schemaDot(tables, detailed = true) {
  let dot = `digraph schema {
graph [
  rankdir=LR,
  bgcolor="#F7F5F2",
  pad=0.5,
  nodesep=0.85,
  ranksep=1.8,
  splines=ortho,
  outputorder=edgesfirst,
  fontname="Inter",
  label="DATABASE SCHEMA",
  labelloc=t,
  fontsize=18,
  fontcolor="#1A1A1A"
];
node [shape=plain, fontname="Inter", fontsize=12];
edge [color="#A98A83", penwidth=1.5, minlen=2];
`;

  for (const table of tables) {
    const pk = keysFor(table.table_name, "PRIMARY KEY");
    const uk = keysFor(table.table_name, "UNIQUE");
    const composite = snapshot.keys.filter(
      (key) =>
        key.table_name === table.table_name &&
        key.constraint_type === "UNIQUE" &&
        key.columns.length > 1,
    );
    const fk = snapshot.foreignKeys
      .filter((key) => key.table_name === table.table_name)
      .map((key) => key.column_name);
    const nameWidth = Math.max(
      145,
      Math.ceil(
        Math.max(...table.columns.map((column) => column.name.length + 2)) *
          8.8 +
          32,
      ),
    );
    const rows = table.columns
      .map((column) => {
        const group = composite.findIndex((key) =>
          key.columns.includes(column.name),
        );
        const flags = [
          pk.includes(column.name) ? "PK" : "",
          fk.includes(column.name) ? "FK" : "",
          uk.includes(column.name) ? "UK" + (group >= 0 ? group + 1 : "") : "",
        ]
          .filter(Boolean)
          .join(" ");
        return `<TR><TD PORT="${column.name}" WIDTH="67" ALIGN="LEFT" BGCOLOR="${flags ? "#F1E5E0" : "#FFFFFF"}"><FONT COLOR="#B74335">${flags || " "}</FONT></TD><TD WIDTH="${nameWidth}" ALIGN="LEFT">${xml(column.name)}${column.nullable === "YES" ? " ?" : ""}</TD>${detailed ? `<TD WIDTH="105" ALIGN="LEFT"><FONT COLOR="#6B6B6B">${typeName(column.type)}</FONT></TD>` : ""}</TR>`;
      })
      .join("");
    dot += `${table.table_name} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="7" COLOR="#D6D2CC" BGCOLOR="#FFFFFF"><TR><TD COLSPAN="${detailed ? 3 : 2}" BGCOLOR="#F1E5E0" ALIGN="LEFT"><B>${table.table_name}</B></TD></TR>${rows}</TABLE>>];\n`;
  }

  for (const fk of snapshot.foreignKeys) {
    const table = snapshot.tables.find(
      (table) => table.table_name === fk.table_name,
    );

    const nullable =
      table.columns.find((column) => column.name === fk.column_name)
        .nullable === "YES";

    const unique = snapshot.keys.some(
      (key) =>
        key.table_name === fk.table_name &&
        key.columns.length === 1 &&
        key.columns[0] === fk.column_name,
    );

    const cardinality = `${nullable ? "0..1" : "1"} : ${unique ? "0..1" : "0..*"}`;

    const tooltip =
      `${fk.references_table}.${fk.references_column} -> ` +
      `${fk.table_name}.${fk.column_name} (${cardinality})`;

    dot +=
      `${fk.references_table} -> ${fk.table_name} ` +
      `[dir=none, tooltip="${tooltip}"];\n`;
  }

  dot += "}\n";
  return detailed
    ? dot
    : dot.replace(
        'node [shape=plain, fontname="Inter", fontsize=12]',
        'node [shape=plain, fontname="Inter", fontsize=15]',
      );
}
const dot = schemaDot(snapshot.tables);

await writeFile(join(source, "database-schema.dot"), dot);

// Fixed positions for a clean, compact database diagram.
const schemaPositions = {
  users: [80, 300],
  technician_profiles: [540, 65],
  technician_specializations: [990, 65],
  incidents: [540, 365],
  comments: [990, 365],
  audit_logs: [1600, 330],
  network_nodes: [80, 810],
  service_locations: [540, 1080],
  customer_services: [990, 875],
  customer_reports: [1600, 835],
  node_code_counters: [80, 1190],
};

function databaseArtwork(tables, detailed) {
  const W = 2080;
  const H = 1360;
  const cardWidth = 370;
  const rowHeight = 26;

  const tableMap = new Map(tables.map((table) => [table.table_name, table]));

  const boxes = Object.fromEntries(
    tables.map((table) => {
      const [x, y] = schemaPositions[table.table_name];

      return [
        table.table_name,
        {
          x,
          y,
          w: cardWidth,
          h: 39 + table.columns.length * rowHeight + 9,
        },
      ];
    }),
  );

  function anchor(name, side, position = 0.5) {
    const b = boxes[name];

    switch (side) {
      case "left":
        return [b.x, b.y + b.h * position];

      case "right":
        return [b.x + b.w, b.y + b.h * position];

      case "top":
        return [b.x + b.w * position, b.y];

      default:
        return [b.x + b.w * position, b.y + b.h];
    }
  }

  function fieldAnchor(name, field) {
    const b = boxes[name];

    const index = tableMap
      .get(name)
      .columns.findIndex((column) => column.name === field);

    if (index === -1) {
      throw new Error(`Missing FK column: ${name}.${field}`);
    }

    return [b.x, b.y + 39 + index * rowHeight + rowHeight / 2];
  }

  function bend(...points) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];

      if (a[0] !== b[0] && a[1] !== b[1]) {
        throw new Error("Non-orthogonal route: " + JSON.stringify(points));
      }
    }

    return points
      .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(" ");
  }

  const p = (table, side, position) => anchor(table, side, position);

  const f = (table, field) => fieldAnchor(table, field);

  const paths = {};

  function put(table, field, points) {
    paths[`${table}.${field}`] = {
      d: bend(...points),
      points,
    };
  }

  const U = boxes.users;
  const I = boxes.incidents;
  const R = boxes.customer_reports;
  const C = boxes.comments;
  const S = boxes.customer_services;
  const N = boxes.network_nodes;
  const L = boxes.service_locations;
  const TP = boxes.technician_profiles;
  const TS = boxes.technician_specializations;

  const top1 = 23;
  const top2 = 42;
  const topMid = 287;
  const topInc = 322;

  const mid = 805;
  const mid2 = 825;

  const xUserGap = 480;
  const xUserGap2 = 501;

  const xIncGap = 947;
  const xIncGap2 = 967;

  const xAuditGap = 1520;
  const xAuditGap2 = 1540;

  const xReportGap = 1515;

  // USERS -> AUDIT LOGS

  put("audit_logs", "actor_id", [
    p("users", "top", 0.22),
    [U.x + U.w * 0.22, top1],
    [xAuditGap2, top1],
    [xAuditGap2, f("audit_logs", "actor_id")[1]],
    f("audit_logs", "actor_id"),
  ]);

  put("audit_logs", "target_user_id", [
    p("users", "top", 0.38),
    [U.x + U.w * 0.38, top2],
    [xAuditGap, top2],
    [xAuditGap, f("audit_logs", "target_user_id")[1]],
    f("audit_logs", "target_user_id"),
  ]);

  // USERS -> COMMENTS

  put("comments", "user_id", [
    p("users", "top", 0.76),
    [U.x + U.w * 0.76, topMid],
    [xIncGap, topMid],
    [xIncGap, f("comments", "user_id")[1]],
    f("comments", "user_id"),
  ]);

  // USERS -> TECHNICIAN PROFILES

  put("technician_profiles", "user_id", [
    p("users", "right", 0.24),
    [xUserGap, U.y + U.h * 0.24],
    [xUserGap, f("technician_profiles", "user_id")[1]],
    f("technician_profiles", "user_id"),
  ]);

  // USERS -> INCIDENTS

  put("incidents", "assigned_to_id", [
    p("users", "right", 0.42),
    [xUserGap, U.y + U.h * 0.42],
    [xUserGap, f("incidents", "assigned_to_id")[1]],
    f("incidents", "assigned_to_id"),
  ]);

  put("incidents", "created_by_id", [
    p("users", "right", 0.6),
    [xUserGap2, U.y + U.h * 0.6],
    [xUserGap2, f("incidents", "created_by_id")[1]],
    f("incidents", "created_by_id"),
  ]);

  // USERS -> CUSTOMER SERVICES

  put("customer_services", "customer_id", [
    p("users", "bottom", 0.22),
    [U.x + U.w * 0.22, mid],
    [xUserGap, mid],
    [xUserGap, f("customer_services", "customer_id")[1]],
    f("customer_services", "customer_id"),
  ]);

  // USERS -> CUSTOMER REPORTS

  put("customer_reports", "assigned_technician_id", [
    p("users", "right", 0.83),
    [xUserGap2, U.y + U.h * 0.83],
    [xUserGap2, mid2],
    [xIncGap2, mid2],
    [xIncGap2, f("customer_reports", "assigned_technician_id")[1]],
    f("customer_reports", "assigned_technician_id"),
  ]);

  // TECHNICIAN PROFILE -> SPECIALIZATIONS

  put("technician_specializations", "profile_id", [
    p("technician_profiles", "right", 0.52),
    [TS.x - 32, TP.y + TP.h * 0.52],
    [TS.x - 32, f("technician_specializations", "profile_id")[1]],
    f("technician_specializations", "profile_id"),
  ]);

  // INCIDENTS -> COMMENTS

  put("comments", "incident_id", [
    p("incidents", "right", 0.81),
    [C.x - 29, I.y + I.h * 0.81],
    [C.x - 29, f("comments", "incident_id")[1]],
    f("comments", "incident_id"),
  ]);

  // INCIDENTS -> AUDIT LOGS

  put("audit_logs", "incident_id", [
    p("incidents", "top", 0.6),
    [I.x + I.w * 0.6, topInc],
    [xAuditGap - 23, topInc],
    [xAuditGap - 23, f("audit_logs", "incident_id")[1]],
    f("audit_logs", "incident_id"),
  ]);

  // INCIDENTS -> CUSTOMER REPORTS

  put("customer_reports", "incident_id", [
    p("incidents", "bottom", 0.84),
    [I.x + I.w * 0.84, mid],
    [xIncGap, mid],
    [xIncGap, f("customer_reports", "incident_id")[1]],
    f("customer_reports", "incident_id"),
  ]);

  // CUSTOMER REPORTS -> AUDIT LOGS

  put("audit_logs", "report_id", [
    p("customer_reports", "right", 0.39),
    [xReportGap, R.y + R.h * 0.39],
    [xReportGap, f("audit_logs", "report_id")[1]],
    f("audit_logs", "report_id"),
  ]);

  // CUSTOMER SERVICES -> CUSTOMER REPORTS

  put("customer_reports", "customer_service_id", [
    p("customer_services", "right", 0.86),
    [R.x - 33, S.y + S.h * 0.86],
    [R.x - 33, f("customer_reports", "customer_service_id")[1]],
    f("customer_reports", "customer_service_id"),
  ]);

  // NETWORK NODES -> CUSTOMER SERVICES

  put("customer_services", "network_node_id", [
    p("network_nodes", "right", 0.3),
    [xUserGap - 28, N.y + N.h * 0.3],
    [xUserGap - 28, f("customer_services", "network_node_id")[1]],
    f("customer_services", "network_node_id"),
  ]);

  // SERVICE LOCATIONS -> CUSTOMER SERVICES

  const xLocationGap = (L.x + L.w + S.x) / 2;

  put("customer_services", "service_location_id", [
    p("service_locations", "right", 0.56),
    [xLocationGap, L.y + L.h * 0.56],
    [xLocationGap, f("customer_services", "service_location_id")[1]],
    f("customer_services", "service_location_id"),
  ]);

  // Validate that all FK relationships are represented.

  const actual = snapshot.foreignKeys.map(
    (fk) => `${fk.table_name}.${fk.column_name}`,
  );

  if (
    actual.length !== 16 ||
    actual.some((key) => !(key in paths)) ||
    Object.keys(paths).length !== actual.length
  ) {
    throw new Error("Schema routes do not match all foreign keys");
  }

  // Cardinality at both ends of each FK relationship.

  const cardinality = snapshot.foreignKeys.map((fk) => {
    const child = snapshot.tables.find((t) => t.table_name === fk.table_name);

    const column = child.columns.find((c) => c.name === fk.column_name);

    const requiredParent = column.nullable === "NO";

    const uniqueChild = snapshot.keys.some(
      (k) =>
        k.table_name === fk.table_name &&
        k.constraint_type === "UNIQUE" &&
        k.columns.length === 1 &&
        k.columns[0] === fk.column_name,
    );

    return {
      ...fk,
      parentLabel: requiredParent ? "1" : "0..1",
      childLabel: uniqueChild ? "0..1" : "0..N",
    };
  });

  const routeSvgs = cardinality
    .map((fk, i) => {
      const key = `${fk.table_name}.${fk.column_name}`;

      const description = `${fk.references_table}.${fk.references_column} → ${key}`;

      const isUser = fk.references_table === "users";

      const stroke = isUser ? "#BD7268" : i % 2 ? "#887F77" : "#A95C50";

      const route = paths[key];
      const end = f(fk.table_name, fk.column_name);

      return `
      <g class="fk">
        <title>${xml(description)}</title>
        <path d="${route.d}"
          fill="none"
          stroke="${stroke}"
          stroke-width="1.6"
          stroke-linecap="square"
          stroke-linejoin="miter"
          opacity=".87"/>
        <circle cx="${end[0]}" cy="${end[1]}"
          r="3" fill="${stroke}"/>
      </g>`;
    })
    .join("\n");

  // Multiplicity labels.

  function endpointTag(x, y, label, align = "center") {
    const width = label.length === 1 ? 23 : label.length === 4 ? 45 : 49;

    const left =
      align === "left" ? x : align === "right" ? x - width : x - width / 2;

    return `
      <g class="multiplicity">
        <rect x="${left.toFixed(1)}"
          y="${(y - 9).toFixed(1)}"
          width="${width}" height="18" rx="5"
          fill="#F7F5F2" stroke="#D9C3BB"
          stroke-width=".75"/>

        <text x="${(left + width / 2).toFixed(1)}"
          y="${(y + 4).toFixed(1)}"
          text-anchor="middle"
          fill="#71423C"
          font-size="12"
          font-weight="600">${label}</text>
      </g>`;
  }

  const cardinalityTags = cardinality
    .map((fk) => {
      const pts = paths[`${fk.table_name}.${fk.column_name}`].points;

      const a = pts[0];
      const b = pts[1];
      const z = pts[pts.length - 1];

      const verticalStart = Math.abs(a[1] - b[1]) > 0.1;

      const sourcePos = verticalStart
        ? [a[0] + 17, a[1] + (b[1] < a[1] ? -19 : 19)]
        : [a[0] + 26, a[1] - 14];

      const targetPos = [z[0] - 25, z[1] - 13];

      return (
        endpointTag(...sourcePos, fk.parentLabel) +
        endpointTag(...targetPos, fk.childLabel)
      );
    })
    .join("\n");

  // Draw every column in every table.

  const cards = tables
    .map((table) => {
      const b = boxes[table.table_name];

      const pk = keysFor(table.table_name, "PRIMARY KEY");
      const uk = keysFor(table.table_name, "UNIQUE");

      const fks = new Set(
        snapshot.foreignKeys
          .filter((fk) => fk.table_name === table.table_name)
          .map((fk) => fk.column_name),
      );

      const bg = `
      <rect x="${b.x}" y="${b.y}"
        width="${b.w}" height="${b.h}"
        rx="7" fill="#FFFFFF"
        stroke="#D9CCC6" stroke-width="1.2"/>

      <path d="
        M${b.x + 7} ${b.y}
        H${b.x + b.w - 7}
        Q${b.x + b.w} ${b.y} ${b.x + b.w} ${b.y + 7}
        V${b.y + 39}
        H${b.x}
        V${b.y + 7}
        Q${b.x} ${b.y} ${b.x + 7} ${b.y}
        Z"
        fill="#EFE3DF"/>`;

      const title = `
      <text x="${b.x + 13}" y="${b.y + 26}"
        fill="#481C1C" font-size="17"
        font-weight="700">
        ${xml(table.table_name)}
      </text>`;

      const rows = table.columns
        .map((column, i) => {
          const y = b.y + 39 + i * rowHeight;

          const flag = pk.includes(column.name)
            ? "PK"
            : fks.has(column.name)
              ? "FK"
              : uk.includes(column.name)
                ? "UK"
                : "";

          const label =
            xml(column.name) + (column.nullable === "YES" ? " ?" : "");

          return `
        ${
          i % 2
            ? `
          <rect x="${b.x + 1}" y="${y}"
            width="${b.w - 2}" height="${rowHeight}"
            fill="#FAF7F5"/>
        `
            : ""
        }

        <text x="${b.x + 11}" y="${y + 18}"
          font-size="12" fill="#B74335"
          font-weight="600">${flag}</text>

        <text x="${b.x + 52}" y="${y + 18}"
          font-size="15" fill="#312B28">${label}</text>

        ${
          detailed
            ? `
          <text x="${b.x + b.w - 12}" y="${y + 18}"
            text-anchor="end"
            fill="#827870" font-size="12">
            ${xml(typeName(column.type))}
          </text>
        `
            : ""
        }
      `;
        })
        .join("");

      return `<g>${bg}${title}${rows}</g>`;
    })
    .join("\n");

  const caption =
    `${tables.length} tables · ` +
    `${snapshot.foreignKeys.length} foreign keys · all columns`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="${W}" height="${H}"
      viewBox="0 0 ${W} ${H}"
      role="img"
      aria-label="Linoryx database schema, ${caption}">

      <title>Linoryx database schema</title>

      <rect width="${W}" height="${H}"
        rx="16" fill="#F7F5F2"/>

      <g font-family="Inter, Arial, sans-serif">
        ${routeSvgs}
        ${cards}
        ${cardinalityTags}

        <text
          x="${boxes.node_code_counters.x}"
          y="${boxes.node_code_counters.y - 13}"
          font-size="12"
          fill="#8E837C">
          Network code sequence · no foreign key
        </text>
      </g>

      <style>
        .fk:hover path {
          stroke: #481C1C;
          stroke-width: 3;
          opacity: 1;
        }
      </style>
    </svg>
  `;
}

// Both diagrams contain all tables and all columns.
// The detailed version additionally displays SQL column types.

for (const [detailed, svgName, pngName, targetWidth] of [
  [true, "database-schema.svg", "database-schema-full.png", 2400],
  [false, "database-schema-overview.svg", "database-schema.png", 2000],
]) {
  const svg = databaseArtwork(snapshot.tables, detailed);

  await writeFile(join(output, svgName), svg);

  await writeFile(
    join(output, pngName),
    new Resvg(svg, {
      font: {
        fontFiles: fonts,
        loadSystemFonts: false,
        defaultFontFamily: "Inter",
      },
      fitTo: {
        mode: "width",
        value: targetWidth,
      },
    })
      .render()
      .asPng(),
  );
}

// A UML use-case model. Associations, includes, extensions and inheritance
// are kept as structured data so the SVG and PlantUML describe the same model.
const actors = [
  {
    id: "customer",
    name: "Customer",
    role: "USER",
    x: 130,
    y: 430,
    cases: ["services", "report", "review"],
  },
  {
    id: "technician",
    name: "Technician",
    role: "TECHNICIAN",
    x: 130,
    y: 930,
    cases: ["assignments", "profile", "work"],
  },
  {
    id: "dispatcher",
    name: "Dispatcher",
    role: "DISPATCHER",
    x: 130,
    y: 1450,
    cases: ["createIncident", "assign", "closeIncident", "operations"],
  },
  {
    id: "administrator",
    name: "Administrator",
    role: "ADMIN",
    x: 130,
    y: 1970,
    cases: ["accounts", "provision", "network"],
  },
];
const useCases = [
  ["services", "View own services", 590, 290],
  ["report", "Report a service problem", 590, 430],
  ["eligibleService", "Check service ownership|and active status", 1200, 430],
  ["review", "Review a resolved report", 590, 570],
  ["confirm", "Confirm the repair", 1200, 540],
  ["stillBroken", "Report still not working", 1200, 650],
  ["assignments", "View assigned reports|and assignment map", 590, 790],
  ["profile", "Update own technician profile", 590, 930],
  ["work", "Start / resolve assigned report", 590, 1070],
  ["assignmentChecks", "Check assignment|and started incident", 1200, 1010],
  ["email", "Send resolution email", 1200, 1120],
  ["createIncident", "Create incident from reports", 590, 1280],
  ["linkReports", "Select and link eligible reports", 1200, 1280],
  ["assign", "Assign a technician", 590, 1420],
  ["available", "Check enabled technician|and AVAILABLE status", 1200, 1420],
  ["closeIncident", "Close an incident", 590, 1560],
  ["closedReports", "Check all linked reports|are closed", 1200, 1560],
  ["operations", "View operations and audit logs", 590, 1690],
  ["accounts", "Manage accounts and roles", 590, 1840],
  ["provision", "Provision a customer service", 590, 1980],
  ["location", "Verify the installation address", 1200, 1920],
  ["node", "Select a network node", 1200, 2060],
  ["network", "Manage network nodes", 590, 2120],
].map(([id, label, x, y]) => ({ id, label, x, y, rx: x > 1000 ? 245 : 190 }));
const relations = [
  {
    from: "report",
    to: "eligibleService",
    type: "include",
    path: "M780 430H955",
    x: 866,
    y: 409,
  },
  {
    from: "confirm",
    to: "review",
    type: "extend",
    guard: "repair works",
    path: "M955 540H860V555H778",
    x: 866,
    y: 518,
  },
  {
    from: "stillBroken",
    to: "review",
    type: "extend",
    guard: "problem remains",
    path: "M955 650H850V590H775",
    x: 866,
    y: 683,
  },
  {
    from: "work",
    to: "assignmentChecks",
    type: "include",
    path: "M780 1070H866V1010H955",
    x: 867,
    y: 988,
  },
  {
    from: "email",
    to: "work",
    type: "extend",
    guard: "resolved; mail on; demo off",
    path: "M955 1120H866V1085H778",
    x: 866,
    y: 1153,
  },
  {
    from: "createIncident",
    to: "linkReports",
    type: "include",
    path: "M780 1280H955",
    x: 866,
    y: 1258,
  },
  {
    from: "assign",
    to: "available",
    type: "include",
    path: "M780 1420H955",
    x: 866,
    y: 1398,
  },
  {
    from: "closeIncident",
    to: "closedReports",
    type: "include",
    path: "M780 1560H955",
    x: 866,
    y: 1538,
  },
  {
    from: "provision",
    to: "location",
    type: "include",
    path: "M780 1980H866V1920H955",
    x: 866,
    y: 1898,
  },
  {
    from: "provision",
    to: "node",
    type: "include",
    path: "M780 1980H850V2060H955",
    x: 866,
    y: 2092,
  },
];
const model = {
  actors,
  useCases,
  relations,
  generalizations: [{ from: "administrator", to: "dispatcher" }],
  precondition: "All roles sign in; access is checked by the backend.",
};
await writeFile(
  join(source, "use-cases.json"),
  JSON.stringify(model, null, 2) + "\n",
);
let puml = "@startuml\nleft to right direction\nskinparam shadowing false\n";
for (const actor of actors)
  puml += `actor "${actor.name}\\n(${actor.role})" as ${actor.id}\n`;
puml += 'rectangle "Linoryx" {\n';
for (const item of useCases)
  puml += `usecase "${item.label.replaceAll("|", "\\n")}" as ${item.id}\n`;
puml += "}\n";
for (const actor of actors)
  for (const id of actor.cases) puml += `${actor.id} -- ${id}\n`;
for (const relation of relations)
  puml += `${relation.from} ..> ${relation.to} : <<${relation.type}>>${relation.guard ? "\\n[" + relation.guard + "]" : ""}\n`;
puml += "administrator --|> dispatcher\n@enduml\n";
await writeFile(join(source, "use-cases.puml"), puml);
const t = (
  x,
  y,
  label,
  size = 24,
  fill = "#1A1A1A",
  anchor = "start",
  weight = 400,
) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${xml(label)}</text>`;
let body = `<rect width="1600" height="2240" rx="20" fill="#F7F5F2"/>${t(52, 72, "Use-case diagram", 46, "#1A1A1A", "start", 600)}${t(52, 115, "All four roles · Required steps and optional actions", 26, "#6B6B6B")}<rect x="280" y="170" width="1270" height="2010" rx="16" fill="#FFFFFF" stroke="#D6D2CC" stroke-width="2"/>${t(310, 214, "Linoryx system", 25, "#1A1A1A", "start", 600)}`;
for (const y of [710, 1190, 1770])
  body += `<path d="M300 ${y}H1530" stroke="#E7E2DC" stroke-dasharray="8 8"/>`;
for (const actor of actors) {
  const y = actor.y - 56;
  body += `<circle cx="${actor.x}" cy="${y}" r="17" fill="none" stroke="#1A1A1A" stroke-width="3"/><path d="M${actor.x} ${y + 17}v48m-27-29h54m-27 29-25 30m25-30 25 30" stroke="#1A1A1A" stroke-width="3" fill="none"/>${t(actor.x, actor.y + 63, actor.name, 24, "#1A1A1A", "middle", 600)}${t(actor.x, actor.y + 91, actor.role, 18, "#6B6B6B", "middle")}`;
  for (const id of actor.cases) {
    const item = useCases.find((item) => item.id === id);
    body += `<path d="M160 ${actor.y - 5}H340V${item.y}H${item.x - item.rx}" stroke="#A09890" stroke-width="1.7" fill="none"/>`;
  }
}
// The administrator has all dispatcher permissions, but does not inherit USER
// or TECHNICIAN permissions. The hollow triangle is actor generalization.
body += `<path d="M113 1914H40V1430H100" fill="none" stroke="#80766E" stroke-width="2" marker-end="url(#generalization)"/>${t(53, 1740, "inherits", 18, "#6B6B6B")}`;
for (const relation of relations) {
  body += `<path d="${relation.path}" fill="none" stroke="#B74335" stroke-width="2" stroke-dasharray="8 6" marker-end="url(#open-arrow)"/>${t(relation.x, relation.y, "«" + relation.type + "»", 21, "#B74335", "middle")}`;
  if (relation.guard)
    body += t(
      relation.x,
      relation.y + 24,
      "[" + relation.guard + "]",
      17,
      "#6B6B6B",
      "middle",
    );
}
for (const item of useCases) {
  body += `<ellipse cx="${item.x}" cy="${item.y}" rx="${item.rx}" ry="43" fill="${item.x > 1000 ? "#F8F0EB" : "#F7F5F2"}" stroke="#D6D2CC" stroke-width="1.7"/>`;
  const labels = item.label.split("|");
  labels.forEach((label, index) => {
    body += t(
      item.x,
      item.y + 8 + (index - (labels.length - 1) / 2) * 29,
      label,
      23,
      "#1A1A1A",
      "middle",
    );
  });
}
const useCaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2240" viewBox="0 0 1600 2240" role="img" aria-label="UML use cases for Customer, Technician, Dispatcher and Administrator"><defs><marker id="open-arrow" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1l10 5-10 5" stroke="#B74335" stroke-width="2" fill="none"/></marker><marker id="generalization" markerWidth="17" markerHeight="17" refX="16" refY="8" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1l15 7-15 7z" stroke="#80766E" stroke-width="2" fill="#F7F5F2"/></marker></defs><g font-family="Inter, Arial, sans-serif">${body}</g></svg>`;
await writeFile(join(output, "use-cases.svg"), useCaseSvg);
await writeFile(
  join(output, "use-cases.png"),
  new Resvg(useCaseSvg, {
    font: {
      fontFiles: fonts,
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
    },
  })
    .render()
    .asPng(),
);
console.log(
  `Rendered schema (${snapshot.tables.length} tables / ${snapshot.foreignKeys.length} foreign keys) and UML (${actors.length} roles / ${useCases.length} use cases / ${relations.length} includes and extensions).`,
);
