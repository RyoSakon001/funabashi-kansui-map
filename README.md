# 船橋冠水マップ

船橋市内の冠水しやすいエリア(Googleマイマップ)と、2点間のルート検索を1つの地図上に表示するシンプルな静的サイトです。GitHub Pagesでホストし、独自ドメインは使用しません。

## 構成

- `index.html` / `css/style.css` / `js/app.js` — サイト本体(素のHTML/CSS/JS、フレームワーク無し) 
- `js/site-config.js` — マイマップのID(非シークレット、コミット対象)
- `js/config.js` — 実際のAPIキーが入るファイル(**gitignore対象、コミットしない**。`.env` または GitHub Actionsから生成)
- `scripts/gen-config.sh` — `.env` から `js/config.js` を生成するスクリプト(ローカル開発用)
- `status.json` — サイトの稼働状態フラグ。何か問題が起きたときに手動で書き換えて注意バナーを出す
- `.github/workflows/deploy.yml` — pushするとGitHub Pagesへ自動デプロイ(本番はリポジトリのSecretから`js/config.js`を生成)

## 使っているAPI / 料金について

1つの地図上に冠水ポイントとルートを両方表示するため、iframe埋め込みではなく **Google Maps JavaScript API** を使ってコード側で地図を描画しています。

- **冠水ポイントの表示**: マイマップのKMLエクスポート(`https://www.google.com/maps/d/kml?mid=...`)を `fetch` で取得し、`DOMParser` でPlacemarkを抽出して `google.maps.Marker` を描画。マイマップ側でピンを編集すればサイトにも反映されます。
  - `google.maps.KmlLayer` はGoogleにより2026年8月(Maps JavaScript API v3.66)で廃止されたため使用していません([Deprecations](https://developers.google.com/maps/deprecations)参照)。
- **ルート検索**: [Routes API](https://developers.google.com/maps/documentation/routes) の `computeRoutes` をREST(`fetch`)で直接呼び、返ってきたエンコード済みポリラインを `google.maps.Polyline` で描画。
  - 2026年10月5日以降、レガシーの **Directions API** は新規のGoogle Cloudプロジェクトでは有効化できなくなったため、Googleが新規開発に案内している **Routes API** を採用しています。
- これらは **Maps JavaScript API** と **Routes API** という、呼び出し回数に応じて課金されるAPIです(月間無料枠あり)。**完全無料ではない**ため、以下の安全策を必ず設定してください:
  1. GCPの「APIとサービス」→「有効なAPIとサービス」→対象API→「クオータ」で、**1日あたりのリクエスト数に上限**を設定し、無料枠を絶対に超えないようにする。
  2. 「お支払い」→「予算とアラート」で低額の予算アラート(メール通知)も設定しておく。
  3. 想定外に料金が発生しそうな場合は `status.json` の `available` を `false` にしてpushすれば、サイト上に注意バナーが表示されます(下記参照)。

## セットアップ手順

### 1. Googleマイマップ

すでに作成済みのマイマップの共有URLからmidを取得し、`js/site-config.js` の `MYMAPS_MID` に設定済みです。ピン(冠水ポイント)を追加・編集したい場合は、マイマップ側を編集するだけでサイトにも反映されます。

### 2. Google Cloud Platform でAPIキーを作成する

1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成。
2. 「お支払い」からBilling account(クレジットカード)を設定。
3. 低額の予算アラートを設定しておく(例: ¥100を超えたらメール通知)。「お支払い」→「予算とアラート」。
   - Embed APIは無料ですが、誤って別のAPI(JavaScript API等)を有効化してしまった場合の保険として設定しておくことを推奨します。
4. 「APIとサービス」→「ライブラリ」から **Maps JavaScript API** と **Routes API** を有効化(Directions APIは2026年10月5日以降新規プロジェクトでは有効化できないため使用しません)。
5. 「認証情報」→「認証情報を作成」→「APIキー」でキーを発行。
6. 発行したキーを選択し、「アプリケーションの制限」を **HTTPリファラー** に設定し、以下を許可リストに追加:
   ```
   https://<あなたのGitHubユーザー名>.github.io/*
   ```
   (ローカルで動作確認する場合は `http://localhost:*` も追加)
7. 「APIの制限」で **Maps JavaScript API と Routes API のみ** を許可するように設定(他のAPIが誤って使われるのを防ぐ)。
8. 「APIとサービス」→「有効なAPIとサービス」から Maps JavaScript API / Routes API それぞれを開き、「クオータ」タブで1日あたりのリクエスト数上限を無料枠内(少な目)に設定する。これが課金を防ぐ実質的なハードリミットになります。

### 3. GitHub repository の設定

1. リポジトリの Settings → Secrets and variables → Actions → New repository secret
   - Name: `GOOGLE_MAPS_API_KEY`
   - Value: 上で発行したAPIキー
2. Settings → Pages → Build and deployment → Source を **GitHub Actions** に設定。
3. `main` ブランチにpushすると `.github/workflows/deploy.yml` が自動でビルド・デプロイします。
   - ビルド時にリポジトリのsecretから `js/config.js` が自動生成されます(手動でコミットする必要はありません)。

### 4. ローカルでの動作確認

```sh
echo "GOOGLE_MAPS_API_KEY=実際のAPIキー" > .env
./scripts/gen-config.sh
python3 -m http.server 8000
# http://localhost:8000 を開く
```

## 緊急時の注意バナー表示

何らかの理由でAPIの利用を一時停止したい場合、`status.json` を以下のように編集してpushすると、サイト上部に注意バナーが表示されます。

```json
{
  "available": false,
  "message": "現在、ルート検索機能を一時停止しています。"
}
```
