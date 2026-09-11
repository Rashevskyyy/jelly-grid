// Plain JS on purpose: it must run on any Node version, including ones too old for the rest of the project.
import { readFileSync } from 'node:fs';

const range = JSON.parse(readFileSync('package.json', 'utf8')).engines.node; // ">=22.18"
const required = range.replace(/[^\d.]/g, '').split('.').map(Number);
const current = process.versions.node.split('.').map(Number);
const tooOld = required.some((part, i) => current.slice(0, i).every((c, j) => c === required[j]) && current[i] < part);

if (tooOld) {
  console.error(`\nNode ${range} is required, but this terminal runs Node ${process.versions.node}.`);
  console.error('Windows (nvm-windows):  nvm install lts   then   nvm use lts');
  console.error('macOS / Linux (nvm):    nvm install --lts  then  nvm use --lts\n');
  process.exit(1);
}
