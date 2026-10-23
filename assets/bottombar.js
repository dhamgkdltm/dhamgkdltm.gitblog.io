// 하단 고정 메뉴: 손잡이(폴더 색인 탭 모양)를 눌러/끌어서 접고 펼친다. 상태는 기억한다.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const bar = document.getElementById("bottom-bar");
    const handle = document.getElementById("bottom-handle");
    if (!bar || !handle) return;
    const KEY = "blog-bottom-bar";
    let closed = false;
    try { closed = localStorage.getItem(KEY) === "closed"; } catch { /* 무시 */ }

    function apply(animate = true) {
      if (!animate) bar.style.transition = "none";
      bar.classList.toggle("closed", closed);
      document.documentElement.classList.toggle("bar-closed", closed);
      if (!animate) requestAnimationFrame(() => { bar.style.transition = ""; });
      try { localStorage.setItem(KEY, closed ? "closed" : "open"); } catch { /* 무시 */ }
    }

    let drag = null;
    handle.addEventListener("pointerdown", (e) => {
      drag = { y: e.clientY, closed0: closed, moved: false };
      bar.setPointerCapture(e.pointerId);
      bar.style.transition = "none";
      e.preventDefault();
    });
    handle.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 4) drag.moved = true;
      const H = bar.offsetHeight || 64;
      const base = drag.closed0 ? H : 0;
      const off = Math.min(H, Math.max(0, base + dy));
      bar.style.transform = `translateY(${off}px)`;
    });
    function endDrag() {
      if (!drag) return;
      const H = bar.offsetHeight || 64;
      const m = bar.style.transform.match(/translateY\(([-\d.]+)px\)/);
      const off = m ? parseFloat(m[1]) : (closed ? H : 0);
      if (!drag.moved) {
        closed = !closed;             // 탭: 토글
      } else {
        closed = off > H * 0.4;       // 40% 넘게 끌었으면 그 상태로
      }
      drag = null;
      bar.style.transform = "";
      bar.style.transition = "";
      apply();
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);

    apply(false);

    const searchBtn = document.getElementById("bottom-search-btn");
    const searchForm = document.getElementById("bottom-search");
    const searchInput = document.getElementById("bottom-search-input");
    const searchClose = document.getElementById("bottom-search-close");
    if (searchBtn && searchForm && searchInput) {
      searchBtn.addEventListener("click", () => {
        const willOpen = searchForm.hidden;
        searchForm.hidden = !willOpen;
        if (willOpen) {
          if (closed) { closed = false; apply(); }
          searchInput.focus();
        }
      });
      if (searchClose) {
        searchClose.addEventListener("click", () => { searchForm.hidden = true; });
      }
    }
  });
})();
