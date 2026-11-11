# 船橋冠水マップ

船橋市内の冠水しやすいエリアと、2点間のルート検索を1つの地図上に表示するシンプルな静的サイトです。GitHub Pagesでホストし、独自ドメインは使用しません。

## 構成

- `index.html` / `css/style.css` / `js/app.js` — サイト本体(素のHTML/CSS/JS、フレームワーク無し)
- `css/brand.css` — ブランドカラー(CSS変数)。配色を変えるときはここだけ編集すればよい
- `favicon.svg` — Material Symbolsの`water_drop`アイコンをブランドカラーで着色したfavicon
- `js/config.js` — 実際のAPIキーが入るファイル(**gitignore対象、コミットしない**。`.env` または GitHub Actionsから生成)
- `scripts/gen-config.sh` — `.env` から `js/config.js` を生成するスクリプト(ローカル開発用)
- `data/flood-points.csv` — 冠水ポイントのデータ(番号・住所・詳細図PDFリンク・緯度・経度)。**唯一の正データ**で、ブラウザが直接読み込む
- `scripts/geocode-addresses.mjs` — 新しい住所を追加したときに手動で実行する、住所→座標変換スクリプト(APIキー不要、OpenStreetMapのNominatimを使用)
- `status.json` — サイトの稼働状態フラグ。何か問題が起きたときに手動で書き換えて注意バナーを出す
- `.github/workflows/deploy.yml` — pushするとGitHub Pagesへ自動デプロイ(本番はリポジトリのSecretから`js/config.js`を生成)

## 使っているAPI / 料金について

1つの地図上に冠水ポイントとルートを両方表示するため、**Google Maps JavaScript API** でコード側に地図を描画している。

- **冠水ポイントの表示**: `data/flood-points.csv`(緯度経度込み)を `fetch` して `google.maps.Marker` を描画するだけ。Google側のAPIは使わないため課金は発生しない。ピンをクリックすると住所と詳細図PDFへのリンクを表示する。
- **ルート検索**: [Routes API](https://developers.google.com/maps/documentation/routes) の `computeRoutes` をREST(`fetch`)で呼び、返ってきたエンコード済みポリラインを `google.maps.Polyline` で描画する。移動手段は車(DRIVE)固定。
- **出発地・目的地の候補表示**: `<gmp-place-autocomplete>`([Places API (New)](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new) のウィジェット)で、入力中に候補を表示する。船橋市周辺(半径20km)を優先的に候補表示するようバイアスをかけている。
- **Maps JavaScript API**、**Routes API**、**Places API (New)** は呼び出し回数に応じて課金されるAPI(月間無料枠あり)。**完全無料ではない**ため、以下の安全策を必ず設定する:
  1. GCPの「APIとサービス」→「有効なAPIとサービス」→対象API→「クオータ」で、**1日あたりのリクエスト数に上限**を設定し、無料枠を絶対に超えないようにする。
  2. 「お支払い」→「予算とアラート」で低額の予算アラート(メール通知)も設定しておく。
  3. 想定外に料金が発生しそうな場合は `status.json` の `available` を `false` にしてpushすれば、サイト上に注意バナーが表示される(下記参照)。

## セットアップ手順

### 1. 冠水ポイントのデータを更新する

`data/flood-points.csv` を直接編集する(`番号,住所,詳細図,lat,lng` の5列)。

- 既存ポイントの住所や詳細図リンクだけ直す場合は、そのままCSVを編集してpushすればよい。
- **新しいポイントを追加する場合**は、`番号,住所,詳細図` を追記したあと以下を実行して `lat,lng` を埋める:
  ```sh
  node scripts/geocode-addresses.mjs > /tmp/flood-points-new.csv
  # 内容を確認してから data/flood-points.csv を上書き
  ```
  (Nominatimの利用規約上、1件あたり約1秒かかる)

### 2. Google Cloud Platform でAPIキーを作成する

1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成。
2. 「お支払い」からBilling account(クレジットカード)を設定。
3. 低額の予算アラートを設定しておく(例: ¥100を超えたらメール通知)。「お支払い」→「予算とアラート」。
4. 「APIとサービス」→「ライブラリ」から **Maps JavaScript API**、**Routes API**、**Places API (New)** を有効化。
5. 「認証情報」→「認証情報を作成」→「APIキー」でキーを発行。
6. 発行したキーを選択し、「アプリケーションの制限」を **HTTPリファラー** に設定し、以下を許可リストに追加:
   ```
   https://<あなたのGitHubユーザー名>.github.io/*
   ```
   (ローカルで動作確認する場合は `http://localhost:*` も追加)
7. 「APIの制限」で **Maps JavaScript API、Routes API、Places API (New) のみ** を許可するように設定(他のAPIが誤って使われるのを防ぐ)。
8. 「APIとサービス」→「有効なAPIとサービス」から上記3つのAPIそれぞれを開き、「クオータ」タブで1日あたりのリクエスト数上限を無料枠内(少な目)に設定する。これが課金を防ぐ実質的なハードリミットになる。

### 3. GitHub repository の設定

1. リポジトリの Settings → Secrets and variables → Actions → New repository secret
   - Name: `GOOGLE_MAPS_API_KEY`
   - Value: 上で発行したAPIキー
2. Settings → Pages → Build and deployment → Source を **GitHub Actions** に設定。
3. `main` ブランチにpushすると `.github/workflows/deploy.yml` が自動でビルド・デプロイする。
   - ビルド時にリポジトリのsecretから `js/config.js` が自動生成される(手動でコミットする必要はない)。

### 4. ローカルでの動作確認

```sh
echo "GOOGLE_MAPS_API_KEY=実際のAPIキー" > .env
./scripts/gen-config.sh
python3 -m http.server 8000
# http://localhost:8000 を開く
```

## 緊急時の注意バナー表示

何らかの理由でAPIの利用を一時停止したい場合、`status.json` を以下のように編集してpushすると、サイト上部に注意バナーが表示される。

```json
{
  "available": false,
  "message": "現在、ルート検索機能を一時停止しています。"
}
```
