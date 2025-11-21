#!/usr/bin/env node
/**
 * Bundle analysis script.
 * Compares current dist/assets sizes against baseline in bundle-baseline.json.
 */
import { promises as fs } from 'fs';
import path from 'path';

const distDir = path.resolve(process.cwd(), 'dist', 'assets');
const baselinePath = path.resolve(process.cwd(), 'bundle-baseline.json');

function parseSize(line) {
  // Expect lines like: filename  ###.## kB │ gzip:  ##.## kB
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const name = parts[0];
  const rawIndex = parts.findIndex(p => p.endsWith('kB'));
  if (rawIndex === -1) return null;
  const rawKB = parseFloat(parts[rawIndex - 1]);
  const gzipMarker = parts.findIndex(p => p === 'gzip:');
  let gzipKB = null;
  if (gzipMarker !== -1 && parts[gzipMarker + 2] === 'kB') {
    gzipKB = parseFloat(parts[gzipMarker + 1]);
  }
  return { name, rawKB, gzipKB };
}

async function getCurrentSizes() {
  const files = await fs.readdir(distDir);
  const assetRegex = /^(.*)-[A-Za-z0-9_-]{6,}\.js$/;
  const results = {};
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const match = f.match(assetRegex);
    const logicalName = match ? match[1] : f.replace(/\.js$/, '');
    const fullPath = path.join(distDir, f);
    const stat = await fs.stat(fullPath);
    const rawKB = +(stat.size / 1024).toFixed(2);
    // gzip size estimation omitted (would require compression); leave null.
    results[logicalName] = { rawKB, gzipKB: null, file: f };
  }
  return results;
}

function diffSizes(baseline, current) {
  const diff = {};
  for (const name of Object.keys(current)) {
    const cur = current[name];
    const base = baseline.files[name];
    const rawDelta = base ? +(cur.rawKB - base.rawKB).toFixed(2) : null;
    diff[name] = {
      rawKB: cur.rawKB,
      gzipKB: cur.gzipKB,
      file: cur.file,
      baselineRawKB: base ? base.rawKB : null,
      deltaRawKB: rawDelta,
      regression: rawDelta !== null ? rawDelta > 5 : false,
    };
  }
  return diff;
}

async function main() {
  const [baselineJSON, currentSizes] = await Promise.all([
    fs.readFile(baselinePath, 'utf-8').then(JSON.parse),
    getCurrentSizes(),
  ]);
  const diff = diffSizes(baselineJSON, currentSizes);
  const report = {
    generatedAt: new Date().toISOString(),
    baselineGeneratedAt: baselineJSON.generatedAt,
    bundles: diff,
  };
  const outPath = path.resolve(process.cwd(), 'bundle-report.json');
  await fs.writeFile(outPath, JSON.stringify(report, null, 2));
  console.log('Bundle report written to bundle-report.json');
  // Print summary table
  console.log('\nName                 RawKB  ΔRawKB  Regression');
  console.log('-----------------------------------------------');
  for (const [name, info] of Object.entries(diff)) {
    const raw = info.rawKB.toFixed(2).padStart(7);
    const delta = (info.deltaRawKB === null ? 'n/a' : info.deltaRawKB.toFixed(2)).padStart(7);
    const reg = info.regression ? 'YES' : 'no';
    console.log(name.padEnd(20) + raw + ' ' + delta + ' ' + reg);
  }
}

main().catch(err => {
  console.error('Error generating bundle report:', err);
  process.exit(1);
});
