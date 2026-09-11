import type { Network } from './networks.ts';

/** Written by scripts/build-all.ts, read by scripts/build-showcase.ts. */
export const REPORT_PATH = 'dist/report.json';

export interface BuildReportRow {
  network: Network;
  /** Path of the uploadable file, relative to the project root. */
  artifact: string;
  bytes: number;
  limitBytes: number | null;
}

export interface BuildReport {
  builtAt: string;
  rows: BuildReportRow[];
}
