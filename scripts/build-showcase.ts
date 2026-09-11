/**
 * Assembles the static site deployed to GitHub Pages:
 *
 *   site/index.html      showcase page (showcase/index.html + data)
 *   site/play/           the web build, full screen
 *   site/builds/         upload-ready files for every network
 *
 * Run `npm run build` first. SHOWCASE_URL (set by CI) is the public base URL the QR code
 * points to; locally it falls back to this machine's LAN address for `npm run showcase:preview`.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import QRCode from 'qrcode';
import { NETWORKS, type Network } from '../build/networks.ts';
import { REPORT_PATH, type BuildReport, type BuildReportRow } from '../build/report.ts';
import { PROFILE } from '../showcase/profile.ts';

const SITE = 'site';
const PREVIEW_PORT = 4173;

function lanAddress(): string {
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const info of interfaces ?? []) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return 'localhost';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

const kb = (bytes: number) => `${Math.round(bytes / 1000)} KB`;
const mb = (bytes: number) => `${bytes / 1_000_000} MB`;

function downloadName(row: BuildReportRow): string {
  return NETWORKS[row.network].packaging === 'zip' ? `${row.network}.zip` : `${row.network}.html`;
}

function sizeRow(row: BuildReportRow): string {
  const { label, packaging } = NETWORKS[row.network];
  const suffix = packaging === 'zip' ? ', ZIP' : '';
  if (row.limitBytes === null) {
    return `<li class="size-row"><span>${label}</span><span class="size-bar no-limit"></span><span class="size-value">${kb(row.bytes)}, no limit</span></li>`;
  }
  const percent = Math.min(100, (row.bytes / row.limitBytes) * 100).toFixed(1);
  return `<li class="size-row"><span>${label}</span><span class="size-bar" style="--fill: ${percent}%" role="img" aria-label="${percent}% of the limit"><span></span></span><span class="size-value">${kb(row.bytes)} of ${mb(row.limitBytes)}${suffix}</span></li>`;
}

// 1. Read the build report and make sure every network is in it.
if (!existsSync(REPORT_PATH)) {
  console.error(`${REPORT_PATH} not found. Run "npm run build" first.`);
  process.exit(1);
}
const report = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as BuildReport;
const networks = Object.keys(NETWORKS) as Network[];
const rows = networks.map((network) => report.rows.find((row) => row.network === network));
const missing = networks.filter((_, index) => !rows[index]);
if (missing.length > 0) {
  console.error(`Build report has no entry for: ${missing.join(', ')}. Run "npm run build" without arguments.`);
  process.exit(1);
}
const builtRows = rows as BuildReportRow[];

// 2. Copy the playable and the network builds.
rmSync(SITE, { recursive: true, force: true });
mkdirSync(`${SITE}/play`, { recursive: true });
mkdirSync(`${SITE}/builds`, { recursive: true });
copyFileSync('dist/web/index.html', `${SITE}/play/index.html`);
for (const row of builtRows) {
  if (row.network !== 'web') copyFileSync(row.artifact, `${SITE}/builds/${downloadName(row)}`);
}

// 3. Fill the template.
const rawBase = process.env.SHOWCASE_URL ?? `http://${lanAddress()}:${PREVIEW_PORT}/`;
const baseUrl = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
const playUrl = new URL('play/', baseUrl).href;
const repoUrl = process.env.VITE_REPO_URL ?? PROFILE.repoUrl;

const qrSvg = (
  await QRCode.toString(playUrl, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#2a1d45', light: '#00000000' },
  })
).replace('<svg ', `<svg role="img" aria-label="QR code for ${escapeHtml(playUrl)}" `);

const downloads = builtRows
  .filter((row) => row.network !== 'web')
  .map((row) => `<a href="builds/${downloadName(row)}" download>${NETWORKS[row.network].label}</a>`)
  .join(', ');

const values: Record<string, string> = {
  AUTHOR: escapeHtml(PROFILE.author),
  LEDE: escapeHtml(PROFILE.lede),
  STATUS: escapeHtml(PROFILE.status),
  TRY_THIS: escapeHtml(PROFILE.tryThis),
  REPO_URL: escapeHtml(repoUrl),
  BUILT_AT: report.builtAt.slice(0, 10),
  QR_SVG: qrSvg,
  SIZE_ROWS: builtRows.map(sizeRow).join('\n          '),
  DOWNLOADS: downloads,
};

let html = readFileSync('showcase/index.html', 'utf8');
for (const [key, value] of Object.entries(values)) html = html.split(`{{${key}}}`).join(value);
const leftover = html.match(/\{\{[A-Z_]+\}\}/);
if (leftover) throw new Error(`Unfilled placeholder in showcase/index.html: ${leftover[0]}`);
writeFileSync(`${SITE}/index.html`, html);

console.log(`Showcase assembled in ${SITE}/`);
console.log(`QR code points to ${playUrl}`);
