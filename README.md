# 船橋冠水マップ

船橋市内の冠水しやすいエリア(Googleマイマップ)と、2点間のルート検索を表示するシンプルな静的サイトです。GitHub Pagesでホストし、独自ドメインは使用しません。

## 構成

- `index.html` / `css/style.css` / `js/app.js` — サイト本体(素のHTML/CSS/JS、フレームワーク無し)
- `js/site-config.js` — マイマップのID(非シークレット、コミット対象)
- `js/config.js` — 実際のAPIキーが入るファイル(**gitignore対象、コミットしない**。`.env` または GitHub Actionsから生成)
- `.env.example` — ローカル開発用のAPIキー設定テンプレート(コミット対象)
- `scripts/gen-config.sh` — `.env` から `js/config.js` を生成するスクリプト(ローカル開発用)
- `status.json` — サイトの稼働状態フラグ。何か問題が起きたときに手動で書き換えて注意バナーを出す
- `.github/workflows/deploy.yml` — pushするとGitHub Pagesへ自動デプロイ(本番はリポジトリのSecretから`js/config.js`を生成)

## 使っているAPI / 料金について

- **マイマップの埋め込み**: APIキー不要、完全無料。
- **ルート検索**: [Google Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started) の `directions` モードをiframeで利用。**Embed APIは呼び出し回数に関わらず課金が発生しない**仕様なので、通常の使い方の範囲で有料になることはありません。
- とはいえAPIキー発行にはGoogle CloudのBilling(クレジットカード)登録が必要です(2025年以降のGoogle Maps Platformの仕様)。カードを登録すること自体は課金が発生するという意味ではありません。

## セットアップ手順

### 1. Googleマイマップ

すでに作成済みのマイマップの共有URLからmidを取得し、`js/site-config.js` の `MYMAPS_MID` に設定済みです。ピン(冠水ポイント)を追加・編集したい場合は、マイマップ側を編集するだけでサイトにも反映されます。

### 2. Google Cloud Platform でAPIキーを作成する

1. [Google Cloud Console](https://console.cloud.google.com/) で新規プロジェクトを作成。
2. 「お支払い」からBilling account(クレジットカード)を設定。
3. 低額の予算アラートを設定しておく(例: ¥100を超えたらメール通知)。「お支払い」→「予算とアラート」。
   - Embed APIは無料ですが、誤って別のAPI(JavaScript API等)を有効化してしまった場合の保険として設定しておくことを推奨します。
4. 「APIとサービス」→「ライブラリ」から **Maps Embed API** を有効化。
5. 「認証情報」→「認証情報を作成」→「APIキー」でキーを発行。
6. 発行したキーを選択し、「アプリケーションの制限」を **HTTPリファラー** に設定し、以下を許可リストに追加:
   ```
   https://<あなたのGitHubユーザー名>.github.io/*
   ```
   (ローカルで動作確認する場合は `http://localhost:*` も追加)
7. 「APIの制限」で **Maps Embed API のみ** を許可するように設定(他のAPIが誤って使われるのを防ぐ)。

### 3. GitHub repository の設定

1. リポジトリの Settings → Secrets and variables → Actions → New repository secret
   - Name: `GOOGLE_MAPS_API_KEY`
   - Value: 上で発行したAPIキー
2. Settings → Pages → Build and deployment → Source を **GitHub Actions** に設定。
3. `main` ブランチにpushすると `.github/workflows/deploy.yml` が自動でビルド・デプロイします。
   - ビルド時にリポジトリのsecretから `js/config.js` が自動生成されます(手動でコミットする必要はありません)。

### 4. ローカルでの動作確認

```sh
cp .env.example .env
# .env を開いて GOOGLE_MAPS_API_KEY=実際のAPIキー に書き換える
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
