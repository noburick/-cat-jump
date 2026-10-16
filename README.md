# ねこのジャンプ広場

Phaser 3・TypeScript・Viteの2Dジャンプゲーム。外部APIやバックエンドは不要です。

公開中のURL: **https://noburick.github.io/-cat-jump/**

この作業ブランチの障害物・Bot拡張は未マージ・未公開です。既存ホームページや他のアプリのリポジトリには変更を加えません。

## 開発・通常操作

Node.js 22.12以上（推奨22 LTS）。

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview
```

Space・広場のクリック・タップでジャンプします。空中での追加入力は無視します。画面構成と既存の操作は維持し、生存時間・回避数と衝突終了時のリトライ表示を追加しています。ゲームオーバー時は「リトライ」、Space、広場のタップで再開できます。FPS表示は画面下のチェックボックス、または `?fps=1` です。

既存の重力1500、ジャンプ初速−560、猫の当たり判定44×58とオフセット(18,16)は維持しています。障害物は従来存在しなかったため、ユーザー承認の通常ゲーム機能として追加しました。AI向けに難易度・当たり判定を変えるモードはありません。

障害物ルールは `src/game/level.ts` に固定しています。

- 木箱1種類（40×36px）。画面右外から左へ移動。初速300px/秒、10秒ごとに新しく出現する木箱の速度を10px/秒ずつ上げ、上限420px/秒。出現済みの木箱の速度は固定。
- 最初の出現は物理時間8秒後。その後の間隔は2.8〜3.4秒。速度・間隔・上限等は `src/game/level.ts` の設定値で変更可能。
- 物理ボディが猫と重なると停止・ゲームオーバー。1ラウンドの衝突は1回。
- 猫を通過した障害物1個につきスコア1。リトライでスコア・ジャンプ数・経過時間・衝突数をリセット。
- 設定時にジャンプで確保できる高さ・空中時間と猫／木箱の幅を検証し、着地猶予と高速の後続箱による追いつきを考慮した最小間隔より短い設定は拒否。
- 本番は通常の乱数。ジャンプやリトライを自動化するコードはゲーム本体にありません。

## 自動テスト

```sh
npx playwright install --with-deps chromium webkit
npm run test:e2e
npm run test:e2e:chromium
npx playwright show-report
npx playwright show-trace test-results/<失敗ケース>/trace.zip
```

PC Chromium、Android設定のChromium、iPhone設定のWebKitで実行します。描画資源の競合による入力タイミングのばらつきを減らすため1ワーカーで直列実行します。既存の起動・ジャンプ・着地・空中追加入力防止・10回連続操作・画面回転・FPS検証を維持し、衝突・実際のリトライ・固定seedの再現を追加しています。連続操作の待機は実際の着地をフレームごとに観測します。テストを通すために障害物を消したり速度を変えたりしません。

通常本番ビルドは4174番・`dist/`、E2E専用ビルドは4173番・`dist-e2e/` で別々に起動します。`dist-e2e/` は公開禁止です。本番ブラウザでもAPI不在・手動ジャンプ・衝突・手動リトライを検証します。実機Safariの最終確認は公開後に行ってください。

## 読み取り専用テストAPIとseed

開発サーバーまたは `npm run build:test` のときだけ利用できます。

```js
window.__CAT_JUMP_TEST__.snapshot()
// state, cat:{x,y,velocityX,velocityY,width,height}, grounded, jumping,
// jumps, gravityY, elapsedMs, nextObstacle:{sequence,distance,width,height,velocityX},
// collisions, score, gameOver, seed, lastJumpAtMs, capabilities
```

凍結したスナップショットだけを返し、入力・リセット・座標設定機能は持ちません。猫と障害物は実際のPhaser物理ボディから取得します。距離は猫のボディ前端から障害物の手前端までの空白です。

開発・E2Eの `?seed=20261016` は32bit非負整数の固定乱数を使います。同じseedならリトライ後も同じ障害物列になります。固定seedの解析・乱数生成器・状態APIは条件付きimport先の `src/testing/` にだけ実装しています。本番の `?seed=` は効果がありません。通常のゲームシーンは乱数生成関数を受け取るだけで、テスト用クエリやBotを認識しません。

`npm run check:production` は本番成果物を走査し、テストAPI・固定seed生成器・Bot判断コードの漏出を検出します。Pagesは全テストの成功後に通常モードで再ビルドし、漏出検査に通った `dist/` だけを公開します。

## ルールベースBotによる20試行比較

```sh
VITE_BASE_PATH=/cat-jump/ npm run build:test
VITE_BASE_PATH=/cat-jump/ npm run preview -- --outDir dist-e2e --host 127.0.0.1 --port 4173
# 別ターミナル
npm run bot:play -- --mode obstacles --trials 20 --seed 20261016 --distances 20,220 --horizon-ms 16000 --output reports/bot-obstacles
```

開発サーバーなら `--url http://127.0.0.1:5173/` を指定します。

- BotはPlaywright側だけで動作し、状態取得→衝突予測→タップを繰り返します。
- 接近速度から衝突時刻を算出し、`h(t)=v*t-g*t²/2` で障害物と猫が水平に重なる全時間帯を安全な高さで通過できる時間帯の中央を狙ってジャンプします。Playwrightの読み取り専用RAF待機で条件を監視し、入力だけをPlaywrightのタッチAPIから送信します。
- 比較するのはジャンプ開始距離のみ。ジャンプ速度560・余白6px。入力遅延は計測用ジャンプで一度だけ実測し、全20試行で同じ補正値を使用します。計測用ジャンプ後にページを読み直すので、試行の初期状態や障害物列は変わりません。どの条件でも同一のゲームルール・猫の物理・障害物列を使用します。
- デフォルトは20試行、開始距離上限20pxと220pxを交互に各10回。成功は物理時間16秒生存。描画負荷による実時間の差とは区別します。
- ゲームオーバーではPlaywrightが本物の「リトライ」をクリックし、スコア・ジャンプ数・衝突数・seedを確認して次の試行に進みます。生存成功後の独立試行はページを読み直します。
- ゲーム側が指定seedの適用を確認できなければ比較を中止します。APIがない本番を操作対象にしないでください。
- 生存したまま時間上限に達した結果は `rightCensored: true`。死亡までの時間や無限生存とは扱いません。

結果は出力先の `results.json` / `results.md`、各試行の `trial-XX.json` / `.png` に保存します。衝突や実行エラー時にはトレースも残します。JSONには各判断の距離・位置・速度・判断理由、スコア、生存物理時間、実経過時間、衝突数、リトライ成否、JS/consoleエラーを保存します。終了コード1は基盤エラーまたは前提不足です。比較のための通常の衝突は測定結果として扱います。

`--mode baseline` は以前の1ジャンプ・着地試行です。[過去の基本20回の結果](docs/bot-baseline/results.md)は障害物攻略の成績ではありません。

改善候補は、入力遅延の実測、複数seed・端末・観測間隔での再検証、障害物幅に応じた開始距離の調整です。単一seedの短時間成績から長時間生存や他の障害物列への汎化を断定しません。

## 失敗分析とCI

- `test-results/`: 最終画像、失敗画像・トレース、`runtime-errors.json`、`game-state.json`、`failure.json`。
- `reports/results.json`: 機械可読のPlaywright全結果。
- `playwright-report/`: HTMLレポート。PRのValidateは成功時も解析成果物を保存。
- Botの出力先: 条件ごとの集計、全判断ログ、画像、失敗トレース。

PRとPushで型チェック・ビルド・操作テストを実行します。デプロイ側も失敗時に解析成果物を保存し、公開を止めます。失敗分析はJSON→画像→トレースの順で確認し、作業ブランチで修正後に再実行してください。

## GitHub Pagesと更新

専用リポジトリは `noburick/-cat-jump`。既存の `noburick/noburick.github.io` のファイルやPages設定は変更しません。公開先は専用リポジトリの `main` に固定し、`*.github.io` リポジトリはガードで拒否します。

```sh
npm run build
npm run test:e2e
git add .
git commit -m "Update game"
git push origin main
```

`main` へのPushで検証成功後に自動公開。作業ブランチやPRからは公開しません。

任意のサブパスの本番ビルドは `VITE_BASE_PATH=/-cat-jump/ npm run build`。baseは先頭・末尾の `/` が必要です。素材も `import.meta.env.BASE_URL` を参照します。猫素材は `public/assets/cat.svg` で差し替え可能です。

## 木箱版のAI実測結果

[JSON](docs/bot-runner/results.json) / [Markdown](docs/bot-runner/results.md)。固定seed・16秒生存・20試行を実施。開始距離上限20pxは0/10成功、220pxは3/10成功。JSエラー0件、衝突17回と実UI経由のリトライ17回を記録しています。入力到達時間のばらつき、長時間・複数seed・実機での検証が改善／追加検証事項です。
