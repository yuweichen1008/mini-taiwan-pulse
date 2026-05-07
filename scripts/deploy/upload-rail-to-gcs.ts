/**
 * 上傳 rail_bundle.json 到 GCS rail-data/ 資料夾
 *
 * 用法：
 *   npm run gcs:upload:rail
 *
 * 前置：
 *   python3 scripts/preprocess/bundle-rail-data.py  → 產出 public/rail_bundle.json
 *
 * 功能：
 *   1. 讀取本地 public/rail_bundle.json
 *   2. 上傳到 rail-data/YYYY/MM/DD/bundle.json
 *   3. 產生並上傳 manifest.json
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Storage } from "@google-cloud/storage";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUCKET_NAME = process.env.GCS_BUCKET ?? "migu-gis-data-collector";
const PREFIX = "rail-data";

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucket = storage.bucket(BUCKET_NAME);

interface RailBundle {
  metadata: {
    date: string;
    systems: string[];
  };
  systems: Record<string, unknown>;
}

interface ManifestDate {
  date: string;
  systems: string[];
}

interface Manifest {
  lastUpdated: string;
  dates: ManifestDate[];
}

async function upload(key: string, body: string): Promise<void> {
  await bucket.file(key).save(body, { metadata: { contentType: "application/json" } });
  console.log(`  ✓ gs://${BUCKET_NAME}/${key} (${(body.length / 1024).toFixed(0)} KB)`);
}

async function getExistingManifest(): Promise<Manifest | null> {
  try {
    const file = bucket.file(`${PREFIX}/manifest.json`);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [content] = await file.download();
    return JSON.parse(content.toString());
  } catch {
    return null;
  }
}

async function main() {
  const dataPath = resolve(__dirname, "../../public/rail_bundle.json");
  console.log(`Reading ${dataPath}...`);
  const raw = readFileSync(dataPath, "utf-8");
  const bundle: RailBundle = JSON.parse(raw);

  const date = bundle.metadata.date;
  const systems = bundle.metadata.systems;
  const [y, m, d] = date.split("-");
  const key = `${PREFIX}/${y}/${m}/${d}/bundle.json`;

  console.log(`\n[${date}] systems: ${systems.join(", ")}`);
  await upload(key, raw);

  const existing = await getExistingManifest();
  const existingDates = existing?.dates ?? [];
  const dateSet = new Map(existingDates.map((d) => [d.date, d]));
  dateSet.set(date, { date, systems });

  const manifest: Manifest = {
    lastUpdated: new Date().toISOString(),
    dates: [...dateSet.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
  await upload(`${PREFIX}/manifest.json`, JSON.stringify(manifest, null, 2));

  console.log("\nDone!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
