/**
 * 上傳 ship_data.json 到 GCS ship-data/ 資料夾
 *
 * 用法：
 *   npm run gcs:upload:ships
 *
 * 功能：
 *   1. 讀取本地 public/ship_data.json
 *   2. 上傳整包到 ship-data/YYYY/MM/DD/data.json（以 metadata.date 為路徑）
 *   3. 產生並上傳 manifest.json
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Storage } from "@google-cloud/storage";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUCKET_NAME = process.env.GCS_BUCKET ?? "migu-gis-data-collector";
const PREFIX = "ship-data";

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
const bucket = storage.bucket(BUCKET_NAME);

interface ShipData {
  metadata: { date: string; ship_count: number; time_range: [number, number] };
  ships: unknown[];
}

interface ManifestDate {
  date: string;
  shipCount: number;
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

function parseDate(dateStr: string): string {
  return dateStr.split("~")[0]!.trim();
}

async function main() {
  const dataPath = resolve(__dirname, "../../public/ship_data.json");
  console.log(`Reading ${dataPath}...`);
  const raw = readFileSync(dataPath, "utf-8");
  const data: ShipData = JSON.parse(raw);
  console.log(`Total ships: ${data.ships.length}`);

  const date = parseDate(data.metadata.date);
  const [y, m, d] = date.split("-");
  const key = `${PREFIX}/${y}/${m}/${d}/data.json`;

  console.log(`\n[${date}] ${data.ships.length} ships`);
  await upload(key, raw);

  const existing = await getExistingManifest();
  const existingDates = existing?.dates ?? [];
  const dateSet = new Map(existingDates.map((d) => [d.date, d]));
  dateSet.set(date, { date, shipCount: data.ships.length });

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
