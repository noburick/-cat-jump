import { gameEvents, type GameState } from '../game/events';

export function mountUI(): HTMLElement {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <main class="shell">
      <header><a class="brand" href="./">NEKO / PLAYGROUND</a><span class="badge">PHASER + TYPESCRIPT</span></header>
      <section class="intro"><p class="eyebrow">小さな一歩から、つくろう。</p><h1>ねこのジャンプ広場<span>CAT JUMP</span></h1><p>ぽんっと跳んで、のんびり着地。ねこと遊ぶ、小さなゲーム。</p></section>
      <section class="play-area" aria-label="ジャンプゲーム">
        <div class="game-top"><span><i></i> ひなたの広場</span><span>生存 <b data-testid="survival">0.0</b>s · 回避 <b data-testid="score">0</b> · JUMPS <b data-testid="jumps">0</b></span></div>
        <div id="game" aria-label="Spaceキー、クリック、タップでジャンプ" tabindex="0"></div>
        <div class="game-bottom"><span data-testid="status" role="status">準備中</span><button id="retry" type="button" hidden>リトライ</button><span><kbd>SPACE</kbd> / クリック / タップでジャンプ</span></div>
      </section>
      <footer><span>あわてず、何度でも。</span><label><input id="fps-toggle" type="checkbox"/> FPSを表示 <output id="fps" hidden></output></label></footer>
    </main>`;
  const toggle = document.querySelector<HTMLInputElement>('#fps-toggle')!;
  const fps = document.querySelector<HTMLOutputElement>('#fps')!;
  toggle.checked = new URLSearchParams(location.search).get('fps') === '1';
  fps.hidden = !toggle.checked;
  toggle.addEventListener('change', () => { fps.hidden = !toggle.checked; });
  const retry = document.querySelector<HTMLButtonElement>('#retry')!;
  retry.addEventListener('click', () => gameEvents.dispatchEvent(new Event('retry-request')));
  const survival = document.querySelector<HTMLElement>('[data-testid="survival"]')!;
  const score = document.querySelector<HTMLElement>('[data-testid="score"]')!;
  const count = document.querySelector<HTMLElement>('[data-testid="jumps"]')!;
  const status = document.querySelector<HTMLElement>('[data-testid="status"]')!;
  gameEvents.addEventListener('state', event => {
    const state = (event as CustomEvent<GameState>).detail;
    count.textContent = String(state.jumps);
    score.textContent = String(state.score);
    survival.textContent = (state.elapsedMs / 1000).toFixed(1);
    retry.hidden = !state.gameOver;
    status.textContent = state.gameOver ? 'ゲームオーバー' : state.grounded ? 'ジャンプできるよ' : 'ジャンプ中';
    fps.value = `${Math.round(state.fps)} FPS`;
  });
  return document.querySelector<HTMLElement>('#game')!;
}
