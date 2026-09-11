/**
 * Builds every ad network target (or only the ones passed as arguments),
 * packages ZIP networks and fails when a build exceeds its upload limit.
 *
 *   npm run build              # all networks
 *   npm run build -- applovin  # one network
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { zipSync } from 'fflate';
import { build } from 'vite';
import { NETWORKS, SIZE_BUDGET_BYTES, isNetwork, type Network } from '../build/networks.ts';
import { REPORT_PATH, type BuildReport, type BuildReportRow } from '../build/report.ts';

const args = process.argv.slice(2);
const unknown = args.filter((arg) => !isNetwork(arg));
if (unknown.length > 0) {
  console.error(`Unknown network(s): ${unknown.join(', ')}`);
  process.exit(1);
}
const targets = (args.length > 0 ? args : Object.keys(NETWORKS)) as Network[];

const rows: BuildReportRow[] = [];
for (const network of targets) {
  const spec = NETWORKS[network];
  await build({ mode: network, logLevel: 'warn' });

  const html = `dist/${network}/index.html`;
  let artifact = html;
  if (spec.packaging === 'zip') {
    artifact = `dist/${network}.zip`;
    writeFileSync(artifact, zipSync({ 'index.html': readFileSync(html) }, { level: 9 }));
  }
  rows.push({ network, artifact, bytes: statSync(artifact).size, limitBytes: spec.limitBytes });
}

const kb = (bytes: number) => `${(bytes / 1000).toFixed(1)} KB`;
let failed = false;

console.log('\nnetwork      size         limit        status   artifact');
for (const { network, artifact, bytes, limitBytes: limit } of rows) {
  let status = 'ok';
  if (limit !== null && bytes > limit) {
    status = 'OVER';
    failed = true;
  } else if (bytes > SIZE_BUDGET_BYTES) {
    status = 'budget';
  }
  const limitText = limit === null ? '-' : kb(limit);
  console.log(
    `${network.padEnd(12)} ${kb(bytes).padEnd(12)} ${limitText.padEnd(12)} ${status.padEnd(8)} ${artifact}`,
  );
}
console.log(`\nbudget: ${kb(SIZE_BUDGET_BYTES)} per build ("budget" = over our own target, still uploadable)`);

const report: BuildReport = { builtAt: new Date().toISOString(), rows };
writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

if (failed) process.exitCode = 1;
