// Build the sealed-snapshot board and offline dashboard with Node 22.18+.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier, PLAIN_NAME } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const textCap = 65_536;
const dossierCap = 1_572_864;

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((value) => value.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

function copyFiles(from: string, to: string): number {
  const files = readdirSync(from, { withFileTypes: true }).filter((entry) => !entry.name.startsWith('.'));
  mkdirSync(to, { recursive: true });
  for (const entry of files) {
    if (!entry.isFile() || !PLAIN_NAME.test(entry.name)) throw new Error(`Invalid artifact name or type: ${entry.name}`);
    copyFileSync(join(from, entry.name), join(to, entry.name));
  }
  return files.length;
}

function run(): void {
  const input = arg('input', '/input');
  const inputFile = input.toLowerCase().endsWith('.json') ? input : join(input, 'snapshot.json');
  if (!existsSync(inputFile)) throw new Error(`No snapshot at ${inputFile}. Pass --input <snapshot.json|directory>.`);
  const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
  const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue !== null) throw new Error(issue);

  const boardJson = JSON.stringify({ rows: board }) + '\n';
  if (Buffer.byteLength(boardJson) > 8 * 1024 * 1024) throw new Error('board.json exceeds 8 MiB');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'board.json'), boardJson);
  writeFileSync(join(out, 'data.js'), dataScript(radar));

  const dashboardFiles = copyFiles(join(here, 'dashboard'), join(out, 'dashboard'));
  const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
  if (shots < 3) throw new Error('Provide at least three screenshots of the generated dashboard');

  const dossier = buildDossier(out, {
    text_max_bytes: textCap,
    screenshots: { max: 4, max_bytes: 524_288 },
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  });
  if (dossier.byteLength > dossierCap) throw new Error('dossier.json exceeds 1.5 MiB');
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`Token radar: ranked ${board.length} protocols, including ${radar.watchlist_size} watchlist records. ${radar.live_size} records contain token data.`);
  console.log(`Wrote board.json, data.js, ${dashboardFiles} dashboard files, ${shots} screenshots and dossier.json to ${out}.`);
}

try {
  run();
} catch (error) {
  console.error('Token radar:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
