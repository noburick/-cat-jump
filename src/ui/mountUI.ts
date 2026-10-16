import { gameEvents, type GameState } from '../game/events';

export function mountUI(): HTMLElement {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <main class="shell">
      <header><a class="brand" href="./">NEKO / PLAYGROUND</a><span class="badge">PHASER + TYPESCRIPT</span></header>
      <section class="intro"><p class="eyebrow">小さな一歩から、つくろう。</p><h1>ねこのジャンプ広場<span>CAT JUMP</span></h1><p>ぽんっと跳んで、のんびり着地。ねこと遊ぶ、小さなゲーム。</p></section>
      <section class="play-area" aria-label="ジャンプゲーム">
        <div class="game-top"><span><i></i> ひなたの広場</span><span>JUMPS <b data-testid="jumps">0</b></span></div>
        <div id="game" aria-label="Spaceキー、クリック、タップでジャンプ" tabindex="0"></div>
        <div class="game-bottom"><span data-testid="status" role="status">準備中</span><span><kbd>SPACE</kbd> / クリック / タップでジャンプ</span></div>
      </section>
      <footer><span>あわてず、何度でも。</span><label><input id="fps-toggle" type="checkbox"/> FPSを表示 <output id="fps" hidden></output></label></footer>
    </main>`;
  const toggle = document.querySelector<HTMLInputElement>('#fps-toggle')!;
  const fps = document.querySelector<HTMLOutputElement>('#fps')!;
  toggle.checked = new URLSearchParams(location.search).get('fps') === '1';
  fps.hidden = !toggle.checked;
  toggle.addEventListener('change', () => { fps.hidden = !toggle.checked; });
  const count = document.querySelector<HTMLElement>('[data-testid="jumps"]')!;
  const status = document.querySelector<HTMLElement>('[data-testid="status"]')!;
  gameEvents.addEventListener('state', event => {
    const state = (event as CustomEvent<GameState>).detail;
    count.textContent = String(state.jumps);
    status.textContent = state.grounded ? 'ジャンプできるよ' : 'ジャンプ中';
    fps.value = `${Math.round(state.fps)} FPS`;
  });
  return document.querySelector<HTMLElement>('#game')!;
}
