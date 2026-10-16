# Bot trial report

Mode: obstacles

Seed: 20261016; horizon: 16000 simulation ms

Completed: 20/20

Success definition: survive configured horizon

Success rate: 15.0%

Obstacle success rate: 0.15



| Jump start distance | Applied | Trials | Successes | Mean score | Mean survival (ms) | Collisions | UI retries |
|---|---|---|---|---|---|---|---|
| 20 | true | 10 | 0 | 0 | 10205.0 | 10 | 10 |
| 220 | true | 10 | 3 | 0.7 | 12251.7 | 7 | 7 |

Survival uses actual physics simulation time, not browser throughput. Survived-horizon runs are right-censored; collision runs end at contact. Collision retries use the real UI, and successful runs reload for the next independent trial. Baseline groups do not use the obstacle trigger distance. No game difficulty, hitbox, or physics setting changes between parameter groups.

## 検証メモ

- 固定seed 20261016、物理時間16秒生存を成功とする20試行。開始距離上限20px・220pxを交互に各10回。
- 最初の計測用ジャンプは試行数に含めず、同じ実測補正150msを全試行で使用。
- JavaScriptエラー0件。衝突17回、実UI経由のリトライ17回成功。
- 判定は保存したスナップショット時点で行う。画像撮影までゲームが進むため、生存成功後にゲームオーバーを示す画像もある。これは16秒生存の成功と矛盾しない。
- 単一seed・短時間・単一Chromium環境の測定であり、220pxが最適であるとは断定しない。
- 開始距離は上限。Botは入力遅延と木箱の幅・速度から安全な時間帯を計算し、その中央に合うまで待機する。
- 改善候補: 遅延を複数回計測してばらつきの範囲を予測に含める、複数seed／高速度域／実機で長時間再検証する。ゲームの重力・当たり判定・難易度をBotに合わせて変更しない。
