// 해/달 궤도 테마: 상단 하늘 띠에서 해와 달이 한 궤도로 연결돼 드래그로 오간다.
// p=0 낮(해가 오른쪽 위), p=1 밤(달이 왼쪽 위). 절반을 넘기면 테마가 바뀐다.
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

    const SUN_T = 0.85;   // 낮일 때 해의 궤도 위치
    const TRAVEL = 0.28;  // 해가 화면 밖으로 나가는 이동량
    const GAP = 1.0;      // 해와 달 사이의 궤도 간격
    let p = document.documentElement.dataset.theme === "dark" ? 1 : 0;
    let raf = null;

    function pos(t, W) {
      const x = W * (-0.02 + 1.04 * t);
      const tc = Math.min(Math.max(t, 0), 1);
      const y = 50 - Math.sin(Math.PI * tc) * 14;
      return { x, y };
    }

    function layout() {
      const W = band.clientWidth;
      const sp = pos(SUN_T + TRAVEL * p, W);
      const mp = pos(SUN_T + TRAVEL * p - GAP, W);
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

    function easeOutBack(k) {
      const c = 1.4;
      return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
    }

    function tweenTo(target) {
      cancelAnimationFrame(raf);
      const from = p;
      const start = performance.now();
      const dur = 520;
      function step(now) {
        const k = Math.min(1, (now - start) / dur);
        p = from + (target - from) * easeOutBack(k);
        layout();
        syncTheme();
        if (k < 1) raf = requestAnimationFrame(step);
        else { p = target; layout(); }
      }
      raf = requestAnimationFrame(step);
    }

    let drag = null;
    band.addEventListener("pointerdown", (e) => {
      if (!e.target.closest(".sky-body")) return;
      cancelAnimationFrame(raf);
      drag = { x: e.clientX, p0: p, moved: false };
      band.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    band.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) drag.moved = true;
      const W = band.clientWidth;
      p = Math.min(1, Math.max(0, drag.p0 + dx / (1.04 * W) / TRAVEL));
      layout();
      syncTheme();
    });
    function endDrag() {
      if (!drag) return;
      const target = drag.moved ? (p > 0.5 ? 1 : 0) : (p > 0.5 ? 0 : 1);
      drag = null;
      tweenTo(target);
    }
    band.addEventListener("pointerup", endDrag);
    band.addEventListener("pointercancel", endDrag);
    window.addEventListener("resize", layout);
    layout();
  });
})();
