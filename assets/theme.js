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

    const SUN0 = 0.85;  // 낮일 때 해의 자리 (오른쪽 위)
    const SWEEP = 1.4;  // 전환 시 궤도 이동량
    const GAP = 0.7;    // 해와 달 사이의 간격 (밤엔 달이 왼쪽 위에 자리)
    let p = document.documentElement.dataset.theme === "dark" ? 1 : 0; // 0 낮, 1 밤
    let raf = null;

    function pos(t, W) {
      const x = W * (-0.02 + 1.04 * t);
      const tc = Math.min(Math.max(t, 0), 1);
      const y = 50 - Math.sin(Math.PI * tc) * 14;
      return { x, y };
    }

// 낮 → 노을 → 밤 팔레트 (p에 따라 색이 흐른다)
    const STOPS = {
      bg:     [[255, 255, 255], [255, 226, 196], [16, 18, 22]],
      surface:[[255, 255, 255], [255, 240, 222], [23, 26, 32]],
      soft:   [[248, 250, 252], [255, 231, 205], [23, 26, 32]],
      border: [[229, 232, 235], [243, 205, 170], [42, 47, 58]],
      muted:  [[107, 118, 132], [146, 110, 92],  [154, 163, 178]],
      text:   [[25, 31, 40],    [58, 36, 24],    [233, 235, 239]],
      skyTop: [[217, 239, 255], [255, 157, 92],  [9, 13, 28]],
      skyBot: [[242, 249, 255], [255, 107, 138], [22, 32, 60]],
    };
    const starsEl = band.querySelector(".sky-stars");
    function mix3(stops, t) {
      const seg = t < 0.5 ? 0 : 1;
      const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      const a = stops[seg], b = stops[seg + 1];
      return a.map((v, i) => Math.round(v + (b[i] - v) * k));
    }
    function rgb(c) { return `rgb(${c[0]}, ${c[1]}, ${c[2]})`; }
    function applyPalette() {
      const root = document.documentElement.style;
      for (const key of ["bg", "surface", "soft", "border", "muted", "text"]) {
        root.setProperty("--" + key, rgb(mix3(STOPS[key], p)));
      }
      band.style.background =
        `linear-gradient(180deg, ${rgb(mix3(STOPS.skyTop, p))} 0%, ${rgb(mix3(STOPS.skyBot, p))} 100%)`;
      if (starsEl) {
        starsEl.style.opacity = String(Math.max(0, Math.min(1, (p - 0.55) / 0.4)) * 0.95);
      }
    }

    function layout() {
      const W = band.clientWidth;
      const sunT = SUN0 - SWEEP * p; // 해: 낮엔 오른쪽 위, 밤엔 왼쪽 밖
      const moonT = sunT + GAP;      // 달: 밤엔 왼쪽 위, 낮엔 오른쪽 밖
      const sp = pos(sunT, W);
      const mp = pos(moonT, W);
      sun.style.transform = `translate(${sp.x - 22}px, ${sp.y - 22}px)`;
      moon.style.transform = `translate(${mp.x - 22}px, ${mp.y - 22}px)`;
      applyPalette();
    }

    function syncTheme() {
      const want = p > 0.5 ? "dark" : "light";
      if (want !== document.documentElement.dataset.theme) {
        document.documentElement.classList.add("theme-anim");
        applyTheme(want);
        setTimeout(() => document.documentElement.classList.remove("theme-anim"), 1000);
      }
    }

    function easeOutQuint(k) { return 1 - Math.pow(1 - k, 5); }
    function easeOutBack(k) {
      const c = 1.4;
      return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
    }

    function easeInOutCubic(k) {
      return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    }

    // whipEl: 휙 돌릴 천체. slow: 클릭 전환 (노을을 천천히 지나간다)
    function tweenTo(target, whipEl, slow) {
      cancelAnimationFrame(raf);
      const from = p;
      const start = performance.now();
      const whip = !!whipEl && Math.round(from) !== target;
      const dur = slow ? 1600 : whip ? 680 : 820;
      const ease = slow ? easeInOutCubic : whip ? easeOutQuint : easeOutBack;
      if (whip) {
        // 도는 속도도 이동 속도와 맞춘다 (클릭 전환이면 1.6초에 걸쳐 한 바퀴)
        const svg = whipEl.querySelector("svg");
        const spinMs = slow ? 1600 : 500;
        if (svg) svg.style.transitionDuration = spinMs + "ms";
        whipEl.classList.add("whip");
        setTimeout(() => {
          whipEl.classList.remove("whip");
          if (svg) svg.style.transitionDuration = "";
        }, spinMs + 50);
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
      p = Math.min(1, Math.max(0, drag.p0 - dx / (W * 1.15)));
      layout();
      syncTheme();
    });
    function endDrag() {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved) {
        tweenTo(p > 0.5 ? 0 : 1, d.el, true); // 탭: 천천히 반대로 전환
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
