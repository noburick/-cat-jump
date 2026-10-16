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

公開URL: **https://noburick.github.io/-cat-jump/**

初回デプロイは成功し、公開URLでの読み込みと操作を確認済みです。作成された専用リポジトリ名は先頭にハイフンがある `-cat-jump` です。既存サイトのファイルや設定は変更しません。

確認済みの状態（2026-10-16）:

- ローカルは `/workspace/cat-jump` の独立リポジトリ。初回コミットを作成し、接続先を `https://github.com/noburick/-cat-jump.git` に設定し、`main` へPush済み。
- 専用リポジトリ `noburick/-cat-jump` が空であることを確認してから初回Pushした。
- 既存 `noburick/noburick.github.io` は `main` の `/` をソースとするlegacy Pages。HTTPS有効、独自ドメインなし。
- 既存サイトにはホームページと `apps/` 等がある。ゲームは専用リポジトリのプロジェクトPagesとして公開。
- 既存サイトや他のリポジトリには変更を加えていない。

PagesのSourceはGitHub Actionsに設定済みです。ワークフローは承認済みの `noburick/-cat-jump` の `main` に公開先を固定しています。リポジトリ変数は不要です。`*.github.io` リポジトリへの公開もガードで拒否します。

初回は Actions → Deploy project Pages → Run workflow を `main` で実行します。以後は `main` へのPushで自動公開されます。

## iPhoneでのプレイテスト

Safariで上記URLを開いてください。画面内の広場をタップすると猫がジャンプします。

- 縦画面で表示・ジャンプ・着地を確認。
- 画面の回転ロックを解除し、横に回転して再度タップ。縦に戻して再確認。
- 画面が横にはみ出さず、ノッチと操作領域が重ならないことを確認。
- 広場の外でスクロール可能、広場のタップではページが意図せず動かないことを確認。
- `?fps=1` をURL末尾に追加するとFPSを確認できる。

## 更新手順

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
- [初回Pagesデプロイ](https://github.com/noburick/-cat-jump/actions/runs/38848731990)成功。公開URLでWebKitのiPhone設定による素材読み込み・タップ・着地・縦横リサイズ操作を確認。
- 実機iPhone Safariでのプレイテストは上記URLを開いて実施してください。
- 既存ホームページのHTMLのSHA-256は作業前後で一致。
- Phaserを含むJSはgzip約334 KB。Viteのチャンクサイズ警告は残るがビルドエラーはない。

## Codex用の自動プレイテスト

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run test:e2e                 # PC Chromium / Android Chromium / iPhone WebKit
npm run test:e2e:chromium        # Chromiumのみ
npx playwright show-report      # HTMLレポートを開く
npx playwright show-trace test-results/<失敗ケース>/trace.zip
```

テストは通常の本番ビルド（4174番）とE2E専用ビルド（4173番）を別々に起動します。出力先はそれぞれ `dist/` と `dist-e2e/`。`build:test` の出力は公開しないでください。Pagesワークフローはテスト後に通常モードで再ビルドし、API不在を確認した `dist/` だけを公開します。

開発サーバー、または `npm run build:test` のときだけ次を使用できます。

```js
window.__CAT_JUMP_TEST__.snapshot()
// { state, cat: { x, y, velocityY }, grounded, jumping, jumps,
//   score: null, gameOver: null, capabilities: { obstacles: false, retry: false, score: false } }
```

APIは入力やリセット機能を持たず、凍結したスナップショットのみ返します。座標・速度は実際のPhaser物理オブジェクトから読み、ジャンプ回数は既存の状態通知から取得します。ゲームの入力・物理・UIロジックは変更していません。`state` はloading / playingです。現行仕様には障害物、ゲームオーバー、リトライ、スコアがないため、該当値はnull、衝突・リトライのテストは理由付きスキップです。ジャンプ回数をスコアとして偽装しません。ランダム要素はなく、固定座標・既存の重力設定をそのまま使用します。

基本テストは座標が上昇してから元の高さに着地すること、空中での再ジャンプ防止、10回連続ジャンプ、タップ操作、縦横リサイズ、FPS表示を確認します。本番API不在はブラウザと `npm run check:production` の成果物走査で検証します。

解析用の出力:

- `test-results/`: 各テストの最終スクリーンショット `final.png`。失敗時はPlaywrightの追加スクリーンショットと `trace.zip`。
- 各テストの添付JSON: `runtime-errors.json`（console.error・JavaScript例外・HTTP/通信エラー）、`game-state.json`（最終状態）、`failure.json`（失敗内容・スタック・ランタイムエラー）。HTML/JSONレポートから添付を参照できます。
- `reports/results.json`: 機械可読の全テスト結果。スキップ理由と、fixture終了時のエラーも含む最終判定を確認できます。
- `playwright-report/`: HTMLレポートと添付。PRのValidateワークフローは成功時も解析成果物をアップロードします。デプロイ側も失敗時に成果物を保存し、公開ジョブを止めます。

失敗分析では `reports/results.json` → 失敗ケースのJSON → スクリーンショット → トレースの順で確認し、作業ブランチで修正して再実行してください。

今回の拡張のローカル再検証: 12件成功、7件スキップ（障害物・リトライ未実装を各3ブラウザで計6件、PC対象外のタッチ専用1件）。型チェック、E2Eビルド、通常ビルド、API漏出チェック成功。意図的な一時テスト失敗で全解析ファイルの生成も検証済みです。

## Level 2ルールベースBot（攻略機能の前提待ち）

現行ゲームには障害物・ゲームオーバー・リトライ・スコア・乱数処理がありません。ゲーム本体を変更せず、Botの衝突予測計算と基本ジャンプ試行を実装しています。障害物攻略モードは必要機能がない場合に理由と証拠を保存して終了コード1で停止します。基本試行の成功を障害物攻略成功と扱いません。

```sh
npm run dev -- --host 127.0.0.1 --port 4180 --strictPort
# 別のターミナル
npm run bot:play -- --mode baseline --trials 20 --url http://127.0.0.1:4180/ --output reports/bot-baseline
```

- `bot/policy.ts`: 接近速度から衝突時刻を求め、ジャンプ軌道 `h(t)=v*t-g*t²/2` で障害物と猫の水平重複時間すべてを安全な高度で通れる場合にジャンプ。障害物は地面からの高さを持ち、水平一定速度で移動する想定。入力遅延の余裕も使用します。
- `bot/run.ts`: テストAPIのスナップショットを読み、Playwrightのタップで操作。各試行のスクリーンショットとJSON、失敗時のトレースを保存。集計は `results.json` と `results.md`。
- `--distances 90,130`: ジャンプ開始距離の候補を交互に適用。baselineでは距離は判断に使用せず、比較不能であることを集計に明記します。
- `--trials`: 20以上。baselineは毎回ページを読み直し、1回タップして上昇・着地を確認する独立試行。リトライ機能の検証にはなりません。
- `--seed 20261016`: 各条件で同じ値を送信。現行baselineは乱数がないので適用対象外。将来の障害物モードではゲーム側が同じseedの適用をAPIで確認できなければ比較を拒否します。クエリだけでシード適用済みとは判断しません。
- `--mode obstacles --horizon-ms 5000`: 将来の障害物ゲーム向け。接地時に衝突予測してジャンプし、死亡時は実際の「リトライ」ボタンをクリック。テストAPI経由で状態を変更しません。現行ゲームでのこのモードは未対応として停止します。

テストAPIに追加した読み取り値: 猫の水平速度・当たり判定サイズ、重力、`nextObstacle`、`collisions`。現行の後二者は未実装なのでnullです。将来の障害物APIの契約は `bot/contracts.ts` に記載しています。`distance` は猫の物理ボディ前端から障害物手前端までの空白、`width` / `height` は障害物の当たり判定寸法、`velocityX` は移動速度です。

生存時間は試行終了で打ち切った観測時間として `rightCensored: true` を記録し、死亡までの時間とは区別します。成功率の定義もJSONに保存します。現行baselineのスコア・衝突回数・障害物攻略成功率はnullです。Botのパラメータはゲーム本体の速度・重力・当たり判定を変更しません。

改善の優先順: 通常ゲームとしての障害物・終了・リトライ・スコア仕様を確定 → 固定seedの障害物生成と観測APIを実装 → 同一seedで開始距離を比較 → 入力遅延の実測と複数seedで汎化を検証。現時点の基本ジャンプだけから最適距離を推奨することはできません。

実測結果: 基本ジャンプ20回中20回成功（100%）、JavaScriptエラー0件。各回の1ジャンプ・着地後に試行を終了しており、障害物攻略・生存限界・リトライの成功率ではありません。[JSON](docs/bot-baseline/results.json) / [Markdown](docs/bot-baseline/results.md)。既存回帰テストと衝突予測テストは15件成功、従来の未実装等による7件スキップ。
