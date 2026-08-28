/* ============================================================
   Self-hosted profile stat cards.

   Queries the GitHub GraphQL API and renders SVG cards straight
   into assets/generated/. No third-party render service, so
   nothing here can turn into a 402 six months from now.

   env:
     GITHUB_TOKEN  required — a PAT gives richer data (private
                   contribution counts); the Actions token works
                   for everything public.
     LOGIN         the account to describe.
   ============================================================ */

import { mkdir, writeFile } from "node:fs/promises";

const TOKEN = process.env.GITHUB_TOKEN;
const LOGIN = process.env.LOGIN;
const OUT = "assets/generated";

if (!TOKEN || !LOGIN) {
  console.error("GITHUB_TOKEN and LOGIN are both required.");
  process.exit(1);
}

/* ── query ────────────────────────────────────────────────── */

const QUERY = `
query($login: String!) {
  user(login: $login) {
    login
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false,
                 orderBy: {field: STARGAZERS, direction: DESC}) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 12, orderBy: {field: SIZE, direction: DESC}) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": `${LOGIN}-profile-stats`,
  },
  body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
});

if (!res.ok) {
  console.error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const payload = await res.json();
if (payload.errors) {
  console.error("GraphQL errors:", JSON.stringify(payload.errors, null, 2));
  process.exit(1);
}

const user = payload.data.user;
if (!user) {
  console.error(`No such user: ${LOGIN}`);
  process.exit(1);
}

/* ── derive ───────────────────────────────────────────────── */

const repos = user.repositories;
const cc = user.contributionsCollection;

const stars = repos.nodes.reduce((n, r) => n + r.stargazerCount, 0);

// Language bytes summed across every non-fork repo the user owns.
const byLang = new Map();
for (const repo of repos.nodes) {
  for (const { size, node } of repo.languages.edges) {
    const cur = byLang.get(node.name) || { size: 0, color: node.color };
    cur.size += size;
    byLang.set(node.name, cur);
  }
}
const langTotal = [...byLang.values()].reduce((n, l) => n + l.size, 0);
const langs = [...byLang.entries()]
  .map(([name, l]) => ({ name, size: l.size, color: l.color || "#8b949e" }))
  .sort((a, b) => b.size - a.size);

const topLangs = langs.slice(0, 6);
const otherSize = langs.slice(6).reduce((n, l) => n + l.size, 0);
if (otherSize > 0) topLangs.push({ name: "Other", size: otherSize, color: "#6e7681" });

// Flatten the calendar, oldest first, and trim days that haven't happened yet.
const days = cc.contributionCalendar.weeks
  .flatMap((w) => w.contributionDays)
  .filter((d) => d.date <= new Date().toISOString().slice(0, 10));

let longest = 0;
let run = 0;
for (const d of days) {
  run = d.contributionCount > 0 ? run + 1 : 0;
  if (run > longest) longest = run;
}

// A streak stays alive until today is over, so an empty today doesn't break it.
let current = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount > 0) current++;
  else if (i === days.length - 1) continue;
  else break;
}

const stats = {
  repos: repos.totalCount,
  stars,
  commits: cc.totalCommitContributions,
  prs: cc.totalPullRequestContributions,
  followers: user.followers.totalCount,
  contributions:
    cc.contributionCalendar.totalContributions + (cc.restrictedContributionsCount || 0),
  current,
  longest,
};

/* ── rendering helpers ────────────────────────────────────── */

const THEMES = {
  dark: {
    bg0: "#0b0a16", bg1: "#140f26",
    grid: "#8b93ff", gridOp: 0.06,
    border: "rgba(255,255,255,.10)",
    label: "#7c86a8", value: "#eceaf5", muted: "#5d6480",
    cell: ["#1b1930", "#3b2f6b", "#5b3fa8", "#8b5cf6", "#c084fc"],
  },
  light: {
    bg0: "#ffffff", bg1: "#f5f4ff",
    grid: "#6d28d9", gridOp: 0.07,
    border: "rgba(15,12,40,.12)",
    label: "#78758f", value: "#14122a", muted: "#9b98ad",
    cell: ["#eceafb", "#d3c9f7", "#ab8bef", "#7c4fe0", "#5b21b6"],
  },
};

const SANS = "'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const compact = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);

const updated = new Date().toISOString().slice(0, 10);

/** Shared chrome: gradient ground, faint grid, hairline border. */
function shell(w, h, t, body, extraDefs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t.bg0}"/><stop offset="1" stop-color="${t.bg1}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#818cf8"><animate attributeName="stop-color" values="#818cf8;#a78bfa;#f472b6;#818cf8" dur="9s" repeatCount="indefinite"/></stop>
      <stop offset="1" stop-color="#f472b6"><animate attributeName="stop-color" values="#f472b6;#818cf8;#a78bfa;#f472b6" dur="9s" repeatCount="indefinite"/></stop>
    </linearGradient>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M28 0H0V28" fill="none" stroke="${t.grid}" stroke-opacity="${t.gridOp}" stroke-width="1"/>
    </pattern>${extraDefs}
  </defs>
  <rect width="${w}" height="${h}" rx="14" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" rx="14" fill="url(#grid)"/>
  <rect x="0" y="0" width="${w}" height="3" rx="1.5" fill="url(#accent)"/>
  <rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="13.5" fill="none" stroke="${t.border}"/>
${body}
</svg>`;
}

function header(title, t, w) {
  return `  <text x="22" y="34" font-family="${MONO}" font-size="12" font-weight="600" letter-spacing="2" fill="${t.label}">${esc(title)}</text>
  <text x="${w - 22}" y="34" text-anchor="end" font-family="${MONO}" font-size="10.5" fill="${t.muted}">${updated}</text>
  <line x1="22" y1="48" x2="${w - 22}" y2="48" stroke="${t.border}"/>`;
}

/** A stat tile: big gradient number over a small caption, faded in on load. */
function tile(x, y, value, label, t, delay) {
  return `  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur=".55s" fill="freeze"/>
    <text x="${x}" y="${y}" font-family="${SANS}" font-size="26" font-weight="700" fill="url(#accent)">${esc(value)}</text>
    <text x="${x}" y="${y + 19}" font-family="${MONO}" font-size="10" letter-spacing="1.1" fill="${t.label}">${esc(label)}</text>
  </g>`;
}

/* ── card: headline numbers ───────────────────────────────── */

function statsCard(t) {
  const W = 470, H = 214;
  const cols = [22, 172, 322];
  const cells = [
    [compact(stats.repos), "REPOS"],
    [compact(stats.stars), "STARS"],
    [compact(stats.commits), "COMMITS 1Y"],
    [compact(stats.contributions), "CONTRIBUTIONS"],
    [compact(stats.current), "CURRENT STREAK"],
    [compact(stats.longest), "LONGEST STREAK"],
  ];

  const body = cells
    .map(([v, l], i) =>
      tile(cols[i % 3], i < 3 ? 100 : 172, v, l, t, 0.1 + i * 0.07)
    )
    .join("\n");

  return shell(W, H, t, `${header(`@${LOGIN}`, t, W)}\n${body}`);
}

/* ── card: language split ─────────────────────────────────── */

function langsCard(t) {
  const W = 470, H = 214;
  const barX = 22, barY = 68, barW = W - 44, barH = 13;

  if (!topLangs.length) {
    return shell(W, H, t,
      `${header("LANGUAGES", t, W)}
  <text x="22" y="${barY + 30}" font-family="${MONO}" font-size="12" fill="${t.muted}">No public repositories yet.</text>`);
  }

  let cursor = barX;
  const segments = topLangs
    .map((l) => {
      const w = Math.max((l.size / langTotal) * barW, 2);
      const seg = `  <rect x="${cursor.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="${barH}" fill="${l.color}"/>`;
      cursor += w;
      return seg;
    })
    .join("\n");

  const legend = topLangs
    .map((l, i) => {
      const x = barX + (i % 2) * 224;
      const y = barY + 44 + Math.floor(i / 2) * 27;
      const pct = ((l.size / langTotal) * 100).toFixed(1);
      return `  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" begin="${(0.35 + i * 0.07).toFixed(2)}s" dur=".5s" fill="freeze"/>
    <circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${l.color}"/>
    <text x="${x + 18}" y="${y}" font-family="${SANS}" font-size="12.5" fill="${t.value}">${esc(l.name)}</text>
    <text x="${x + 196}" y="${y}" text-anchor="end" font-family="${MONO}" font-size="11.5" fill="${t.label}">${pct}%</text>
  </g>`;
    })
    .join("\n");

  const defs = `
    <clipPath id="barClip"><rect x="${barX}" y="${barY}" width="0" height="${barH}" rx="6.5">
      <animate attributeName="width" from="0" to="${barW}" begin=".15s" dur="1s" fill="freeze" calcMode="spline" keySplines=".2 .8 .3 1"/>
    </rect></clipPath>`;

  const body = `${header("LANGUAGES", t, W)}
  <g clip-path="url(#barClip)">
${segments}
  </g>
${legend}`;

  return shell(W, H, t, body, defs);
}

/* ── card: contribution heatmap ───────────────────────────── */

function graphCard(t) {
  const CELL = 9, GAP = 2, STEP = CELL + GAP;
  const weeks = cc.contributionCalendar.weeks;
  const W = 44 + weeks.length * STEP;
  const H = 140;
  const top = 62;

  const peak = Math.max(1, ...days.map((d) => d.contributionCount));
  const level = (n) => {
    if (n === 0) return 0;
    const r = n / peak;
    return r > 0.66 ? 4 : r > 0.4 ? 3 : r > 0.15 ? 2 : 1;
  };

  const cells = weeks
    .map((week, wi) =>
      week.contributionDays
        .map((d) => {
          // Row by real weekday: GitHub's first week can start mid-week, so a
          // plain index would shear the whole grid by a few days.
          const x = 22 + wi * STEP;
          const y = top + new Date(`${d.date}T00:00:00Z`).getUTCDay() * STEP;
          const fill = t.cell[level(d.contributionCount)];
          const delay = (0.2 + wi * 0.012).toFixed(3);
          return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${fill}" opacity="0"><animate attributeName="opacity" from="0" to="1" begin="${delay}s" dur=".4s" fill="freeze"/></rect>`;
        })
        .join("")
    )
    .join("\n  ");

  const legend = t.cell
    .map((c, i) => `<rect x="${W - 118 + i * 14}" y="${H - 26}" width="9" height="9" rx="2" fill="${c}"/>`)
    .join("");

  const body = `${header("CONTRIBUTIONS", t, W)}
  <text x="22" y="${top - 8}" font-family="${MONO}" font-size="11" fill="${t.muted}">${stats.contributions} in the last year</text>
  ${cells}
  <text x="${W - 140}" y="${H - 18}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${t.muted}">less</text>
  ${legend}
  <text x="${W - 22}" y="${H - 18}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${t.muted}">more</text>`;

  return shell(W, H, t, body);
}

/* ── write ────────────────────────────────────────────────── */

await mkdir(OUT, { recursive: true });

for (const [name, build] of [
  ["stats", statsCard],
  ["langs", langsCard],
  ["graph", graphCard],
]) {
  for (const theme of ["dark", "light"]) {
    const file = `${OUT}/${name}-${theme}.svg`;
    await writeFile(file, build(THEMES[theme]), "utf8");
    console.log(`wrote ${file}`);
  }
}

console.log(
  `\n${LOGIN}: ${stats.repos} repos · ${stats.stars} stars · ` +
  `${stats.contributions} contributions · streak ${stats.current}/${stats.longest}`
);
