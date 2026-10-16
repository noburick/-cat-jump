# ねこのジャンプ広場

Phaser 3 + TypeScript + Vite の最小2Dジャンプゲーム。外部API・バックエンド・外部フォントへの依存はありません。

## 開発

Node.js 22.12以上（推奨22 LTS）とnpmを使用します。

```sh
npm ci
npm run dev
```

表示されたURLを開き、Space・画面のクリック・タップでジャンプします。着地前の追加入力は無視します。画面は16:9の論理座標960×540を保ったまま縮小します。FPSは画面下のチェックボックス、または `?fps=1` で表示できます。

```sh
npm run typecheck
npm run build
npm run preview
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Playwrightは本番ビルドを `/cat-jump/` で起動し、PC・Android設定のChromiumとiPhone設定のWebKitで表示、入力、空中での再ジャンプ防止、着地、FPS表示、素材読み込みを検証します。タッチ端末では縦→横→縦の画面サイズ変更後も、Canvasの寸法とタップ位置を確認します。WebKitの自動テストは実機Safariの代替ではないため、公開後の実機確認も必要です。

## 構成

- `src/game/`: Phaserの物理・入力・素材管理
- `src/ui/`: DOMによる画面UI。ゲームの状態イベントを購読
- `public/assets/cat.svg`: 差し替え可能な仮の猫素材
- `src/game/assets.ts`: 素材キーとURL。画像寸法変更時はJumpSceneの当たり判定も調整
- `tests/`: Playwrightによる本番ビルドの操作テスト
- `.github/workflows/ci.yml`: push / PRの型チェック・ビルド・操作テスト
- `.github/workflows/deploy.yml`: 承認後、mainへのPushでPagesに自動公開

## GitHub Pages

公開予定URL: **https://noburick.github.io/-cat-jump/**

コードのPushとPagesの有効化は完了しました。初回デプロイを実行中です。作成された専用リポジトリ名は先頭にハイフンがある `-cat-jump` です。既存サイトのファイルや設定は変更しません。

確認済みの状態（2026-10-16）:

- ローカルは `/workspace/cat-jump` の独立リポジトリ。初回コミットを作成し、接続先を `https://github.com/noburick/-cat-jump.git` に設定し、`main` へPush済み。
- 専用リポジトリ `noburick/-cat-jump` が空であることを確認してから初回Pushした。
- 既存 `noburick/noburick.github.io` は `main` の `/` をソースとするlegacy Pages。HTTPS有効、独自ドメインなし。
- 既存サイトにはホームページと `apps/` 等がある。ルートに `cat-jump` はなく、予定URLは404。
- 既存サイトや他のリポジトリには変更を加えていない。

PagesのSourceはGitHub Actionsに設定済みです。ワークフローは承認済みの `noburick/-cat-jump` の `main` に公開先を固定しています。リポジトリ変数は不要です。`*.github.io` リポジトリへの公開もガードで拒否します。

初回は Actions → Deploy project Pages → Run workflow を `main` で実行します。以後は `main` へのPushで自動公開されます。

## iPhoneでのプレイテスト

初回公開後、Safariで上記URLを開いてください。画面内の広場をタップすると猫がジャンプします。

- 縦画面で表示・ジャンプ・着地を確認。
- 画面の回転ロックを解除し、横に回転して再度タップ。縦に戻して再確認。
- 画面が横にはみ出さず、ノッチと操作領域が重ならないことを確認。
- 広場の外でスクロール可能、広場のタップではページが意図せず動かないことを確認。
- `?fps=1` をURL末尾に追加するとFPSを確認できる。

## 更新手順（初回公開後）

```sh
npm ci
npm run build
npm run test:e2e
git add .
git commit -m "Update game"
git push origin main
```

`main` へのPushで型チェック・ビルド・Chromium/WebKitテストを実行し、成功後にPagesへ自動公開します。Actionsの成功を待ち、同じURLをSafariで再読み込みしてください。失敗時は公開ジョブを実行せず、直前の公開版を維持します。PRはCI検証のみです。

任意のサブパス用ビルド:

```sh
VITE_BASE_PATH=/-cat-jump/ npm run build
```

baseは先頭・末尾に `/` が必要です。素材パスも `import.meta.env.BASE_URL` を参照します。未指定なら `/` です。デプロイワークフローではリポジトリ名から自動設定します。

## 検証結果（2026-10-16）

- 型チェックとサブパスでの本番ビルド成功。
- Playwright: 5件成功。タッチ専用テスト1件はPCプロジェクトで意図的にスキップ。
- ChromiumのPC・Android設定、およびWebKitのiPhone設定で操作成功。
- Android/WebKitの縦→横→縦リサイズ後の描画寸法・タップ操作成功。
- WebKitの横画面で検出したCanvas寸法の追従問題はResizeObserverによる再計算で修正。
- ローカルWebKitは作業用ディレクトリに不足OSライブラリを展開して実行。CIではPlaywrightの `--with-deps` で導入する。
- GitHub Actionsの[Validate](https://github.com/noburick/-cat-jump/actions/runs/38845263411)で型チェック・ビルド・操作テスト成功。
- 実機iPhone Safariと公開URLの正常表示は初回公開後に確認する。
- 既存ホームページのHTMLのSHA-256は作業前後で一致。
- Phaserを含むJSはgzip約334 KB。Viteのチャンクサイズ警告は残るがビルドエラーはない。
