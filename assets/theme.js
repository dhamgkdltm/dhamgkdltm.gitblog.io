// 해/달 궤도 테마: 해와 달이 한 궤도로 연결돼 있다.
// 왼쪽으로 드래그 = 밤으로 (해가 하늘을 가로질러 지고, 달이 오른쪽에서 뜬다)
// 오른쪽으로 드래그 = 낮으로 (달이 지고, 해가 왼쪽에서 뜬다)
// 절반을 넘긴 채 손을 떼면 휙 돌면서 전환이 완성된다.
(function () {
  function syncGiscus(theme) {
    const frame = document.querySelector("iframe.giscus-frame");
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(
        { giscus: { setConfig: { theme: theme === "dark" ? "dark" : "light" } } },
        "https://giscus.app"
      );
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("blog-theme", theme); } catch { /* 무시 */ }
    syncGiscus(theme);
  }

  document.addEventListener("DOMContentLoaded", () => {
    syncGiscus(document.documentElement.dataset.theme || "light");
    const band = document.getElementById("sky-band");
    if (!band) return;
    const sun = document.getElementById("sky-sun");
    const moon = document.getElementById("sky-moon");

    const PRIME = 0.85; // 떠 있을 때 자리 (오른쪽 위)
    let p = document.documentElement.dataset.theme === "dark" ? 1 : 0; // 0 낮, 1 밤
    let raf = null;

    function pos(t, W) {
      const x = W * (-0.02 + 1.04 * t);
      const tc = Math.min(Math.max(t, 0), 1);
      const y = 50 - Math.sin(Math.PI * tc) * 14;
      return { x, y };
    }

    function layout() {
      const W = band.clientWidth;
      const sunT = PRIME - p;        // 해: 낮엔 PRIME, 밤엔 왼쪽 밖
      const moonT = sunT + 1;        // 달: 해와 궤도 하나 간격
      const sp = pos(sunT, W);
      const mp = pos(moonT, W);
      sun.style.transform = `translate(${sp.x - 22}px, ${sp.y - 22}px)`;
      moon.style.transform = `translate(${mp.x - 22}px, ${mp.y - 22}px)`;
    }

    function syncTheme() {
      const want = p > 0.5 ? "dark" : "light";
      if (want !== document.documentElement.dataset.theme) {
        document.documentElement.classList.add("theme-anim");
        applyTheme(want);
        setTimeout(() => document.documentElement.classList.remove("theme-anim"), 600);
      }
    }

    function easeOutQuint(k) { return 1 - Math.pow(1 - k, 5); }
    function easeOutBack(k) {
      const c = 1.4;
      return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
    }

    // whipEl: 휙 돌릴 천체 (있으면 한 바퀴 회전하며 빠르게 전환)
    function tweenTo(target, whipEl) {
      cancelAnimationFrame(raf);
      const from = p;
      const start = performance.now();
      const whip = !!whipEl && Math.round(from) !== target;
      const dur = whip ? 420 : 520;
      const ease = whip ? easeOutQuint : easeOutBack;
      if (whip) {
        whipEl.classList.add("whip");
        setTimeout(() => whipEl.classList.remove("whip"), 500);
      }
      function step(now) {
        const k = Math.min(1, (now - start) / dur);
        p = from + (target - from) * ease(k);
        layout();
        syncTheme();
        if (k < 1) raf = requestAnimationFrame(step);
        else { p = target; layout(); }
      }
      raf = requestAnimationFrame(step);
    }

    let drag = null;
    band.addEventListener("pointerdown", (e) => {
      const body = e.target.closest(".sky-body");
      if (!body) return;
      cancelAnimationFrame(raf);
      drag = { x: e.clientX, p0: p, moved: false, el: body };
      band.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    band.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) drag.moved = true;
      const W = band.clientWidth;
      // 왼쪽으로 끌면 밤으로, 오른쪽으로 끌면 낮으로
      p = Math.min(1, Math.max(0, drag.p0 - dx / (1.04 * W)));
      layout();
      syncTheme();
    });
    function endDrag() {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved) {
        tweenTo(p > 0.5 ? 0 : 1, d.el); // 탭: 반대로 전환
      } else {
        tweenTo(p > 0.5 ? 1 : 0, d.el); // 절반 넘으면 휙 완성, 아니면 복귀
      }
    }
    band.addEventListener("pointerup", endDrag);
    band.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", layout);
    layout();
  });
})();
