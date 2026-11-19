#!/usr/bin/env node
// data/flood-points.csv の各地点ごとに、OGP画像付きの共有用静的ページを
// share/{番号}.html として生成する。X(Twitter)の投稿にURLを含めると
// ここで設定したog:imageがカード画像として表示される。
// CSVを更新したら手動で再実行すること(APIキー不要)。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SITE_URL = "https://ryosakon001.github.io/funabashi-kansui-map";

const csvPath = new URL("../data/flood-points.csv", import.meta.url);
const csv = readFileSync(csvPath, "utf8").replace(/^﻿/, "").trim();
const [headerLine, ...lines] = csv.split(/\r?\n/);
const headers = headerLine.split(",");

const rows = lines.map((line) => {
  const values = line.split(",");
  const row = {};
  headers.forEach((key, i) => {
    row[key] = values[i];
  });
  return row;
});

const shareDir = new URL("../share/", import.meta.url);
mkdirSync(shareDir, { recursive: true });

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

for (const row of rows) {
  const number = row["番号"];
  const address = row["住所"];
  const photo = row["写真"];
  const title = escapeHtml(`No.${number} ${address} - 船橋冠水マップ`);
  const imageUrl = photo ? `${SITE_URL}/${photo}` : `${SITE_URL}/favicon.svg`;
  const pageUrl = `${SITE_URL}/share/${number}.html`;

  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta property="og:title" content="${title}" />
<meta property="og:description" content="大雨時に冠水しやすいポイントです。船橋冠水マップで周辺のルートを確認できます。" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:url" content="${pageUrl}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/svg+xml" href="../favicon.svg" />
<link rel="stylesheet" href="../css/brand.css" />
<style>
  body { max-width: 480px; margin: 2rem auto; padding: 0 1rem; font-family: "Hiragino Sans", "Noto Sans JP", sans-serif; color: var(--color-text); }
  h1 { font-size: 1.2rem; }
  img { width: 100%; border-radius: 8px; }
  a { color: var(--color-primary-dark); }
</style>
</head>
<body>
  <h1>No.${number} ${escapeHtml(address)}</h1>
  ${photo ? `<img src="../${photo}" alt="${escapeHtml(address)}の現地写真" />` : ""}
  <p><a href="../index.html">&larr; 船橋冠水マップに戻る</a></p>
</body>
</html>
`;

  writeFileSync(new URL(`${number}.html`, shareDir), html);
}

console.log(`${rows.length}件の共有ページを share/ に生成しました。`);
