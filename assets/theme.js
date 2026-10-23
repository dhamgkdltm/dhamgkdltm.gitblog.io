// 해/달 테마: 저장된 설정을 따르고, 토글 시 댓글(giscus) 테마도 함께 전환
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

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("blog-theme", theme); } catch { /* 무시 */ }
    syncGiscus(theme);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.classList.add("theme-anim");
        apply(next);
        setTimeout(() => document.documentElement.classList.remove("theme-anim"), 600);
      });
    }
    // 댓글이 이미 떠 있으면 현재 테마에 맞춤
    syncGiscus(document.documentElement.dataset.theme || "light");
  });
})();
