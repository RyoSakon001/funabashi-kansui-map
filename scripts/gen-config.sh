#!/usr/bin/env bash
# .env から js/config.js を生成する(ローカル開発用)。
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo ".env が見つかりません。.env.example をコピーして作成してください。" >&2
  exit 1
fi

set -a
source .env
set +a

cat > js/config.js <<EOF
// scripts/gen-config.sh が .env から生成したファイル。手動編集しないこと。
const GOOGLE_MAPS_API_KEY = "${GOOGLE_MAPS_API_KEY:-}";
EOF

echo "js/config.js を生成しました。"
