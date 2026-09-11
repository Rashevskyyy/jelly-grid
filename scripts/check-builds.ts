/**
 * Static preflight for every network build, run after `npm run build`. It catches what gets ads
 * rejected before a human reviewer does: extra files, external resources, wrong or missing APIs.
 * It does not replace the networks' own preview tools (see README).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { NETWORKS, type Network } from '../build/networks.ts';

const GOOGLE_EXIT_API = 'https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js';

interface Rule {
  name: string;
  test: (html: string) => boolean;
}

const has = (text: string): Rule['test'] => (html) => html.includes(text);
const lacks = (text: string): Rule['test'] => (html) => !html.includes(text);

/** External resources in markup or CSS, minus the ones a network explicitly requires. */
function externalResources(html: string, allowed: string[]): string[] {
  const found = [
    ...html.matchAll(/<(?:script|link|img|iframe|audio|video|source)\b[^>]*\b(?:src|href)="([^"]+)"/gi),
    ...html.matchAll(/url\(\s*['"]?((?:https?:)?\/\/[^'")]+)/gi),
  ].map((match) => match[1]);
  return found.filter((url) => !url.startsWith('data:') && !allowed.includes(url));
}

const common: Rule[] = [
  { name: 'has a viewport meta tag', test: has('name="viewport"') },
  { name: 'does not use localStorage', test: lacks('localStorage') },
];

const perNetwork: Record<Exclude<Network, 'web'>, Rule[]> = {
  applovin: [{ name: 'uses MRAID', test: has('getMaxSize') }, { name: 'no Google ExitApi', test: lacks('ExitApi') }, { name: 'no Meta API', test: lacks('FbPlayableAd') }],
  unity: [{ name: 'uses MRAID', test: has('getMaxSize') }, { name: 'no Google ExitApi', test: lacks('ExitApi') }, { name: 'no Meta API', test: lacks('FbPlayableAd') }],
  ironsource: [{ name: 'uses MRAID', test: has('getMaxSize') }, { name: 'no Google ExitApi', test: lacks('ExitApi') }, { name: 'no Meta API', test: lacks('FbPlayableAd') }],
  google: [
    { name: 'loads exitapi.js', test: has(GOOGLE_EXIT_API) },
    { name: 'calls ExitApi.exit', test: has('ExitApi.exit') },
    { name: 'declares both orientations', test: has('name="ad.orientation" content="portrait,landscape"') },
    { name: 'no Meta API', test: lacks('FbPlayableAd') },
  ],
  meta: [{ name: 'calls FbPlayableAd.onCTAClick', test: has('onCTAClick') }, { name: 'no Google ExitApi', test: lacks('ExitApi') }],
};

let failures = 0;
for (const network of Object.keys(perNetwork) as Array<keyof typeof perNetwork>) {
  const dir = `dist/${network}`;
  const problems: string[] = [];

  const files = readdirSync(dir);
  if (files.length !== 1 || files[0] !== 'index.html') problems.push(`expected only index.html, found: ${files.join(', ')}`);

  const html = readFileSync(`${dir}/index.html`, 'utf8');
  const allowed = network === 'google' ? [GOOGLE_EXIT_API] : [];
  const external = externalResources(html, allowed);
  if (external.length > 0) problems.push(`external resources: ${external.join(', ')}`);

  for (const rule of [...common, ...perNetwork[network]]) {
    if (!rule.test(html)) problems.push(`failed: ${rule.name}`);
  }

  const label = NETWORKS[network].label.padEnd(12);
  if (problems.length === 0) console.log(`check  ${label} ok`);
  else {
    failures += problems.length;
    for (const problem of problems) console.log(`check  ${label} ${problem}`);
  }
}

if (failures > 0) process.exitCode = 1;
