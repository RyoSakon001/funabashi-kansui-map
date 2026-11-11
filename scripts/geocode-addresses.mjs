#!/usr/bin/env node
// data/flood-points.csv に新しい住所を追加したときに手動で実行するスクリプト。
// 住所をNominatim(OSM)で丁目レベルまで解決し、lat,lng列を付けたCSVを標準出力に書き出す。
// 出力を確認した上で data/flood-points.csv を上書きする(APIキー不要)。
// Nominatimの利用規約により1リクエスト/秒に制限している。
import { readFileSync } from "node:fs";

const UA = "funabashi-kansui-map-onetime-geocode/1.0 (github.com/RyoSakon001)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function simplify(address) {
  // "X丁目Y番地" -> "X丁目" / "町Y番地" -> "町" のように番地以降を落とす
  return address.replace(/\d+番地$/, "").trim();
}

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "jp");

  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const data = await res.json();
  return data[0] || null;
}

const csvPath = new URL("../data/flood-points.csv", import.meta.url);
const csv = readFileSync(csvPath, "utf8").replace(/^﻿/, "").trim();
const [headerLine, ...lines] = csv.split(/\r?\n/);
const headers = headerLine.split(",");

const records = lines.map((line) => {
  const values = line.split(",");
  const row = {};
  headers.forEach((key, i) => {
    row[key] = values[i];
  });
  return row;
});

console.error(`${records.length}件を処理します...`);

const results = [];
for (const record of records) {
  const address = record["住所"];
  const candidates = [`千葉県${address}`, `千葉県${simplify(address)}`, simplify(address)];

  let hit = null;
  for (const query of candidates) {
    hit = await geocode(query);
    await sleep(1100);
    if (hit) break;
  }

  results.push({
    ...record,
    lat: hit ? hit.lat : "",
    lng: hit ? hit.lon : "",
    matched: hit ? hit.display_name : "",
  });

  console.error(
    `${record["番号"]}: ${address} -> ${hit ? `${hit.lat},${hit.lon} (${hit.display_name})` : "見つかりませんでした"}`
  );
}

const failed = results.filter((r) => !r.lat);
console.error(`\n完了。失敗: ${failed.length}件 / ${results.length}件`);

console.log("番号,住所,詳細図,lat,lng");
for (const r of results) {
  console.log(`${r["番号"]},${r["住所"]},${r["詳細図"]},${r.lat},${r.lng}`);
}
