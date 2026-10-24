// 상단 종류 메뉴: posts.json의 카테고리를 모아 메뉴로 만든다.
(async function () {
  const nav = document.getElementById("site-menu");
  if (!nav) return;
  const BASE = "/dhamgkdltm.gitblog.io";
  try {
    const res = await fetch(`${BASE}/posts.json`, { cache: "no-store" });
    const posts = (await res.json()).filter((p) => p.published);
    const cats = [...new Set(posts.map((p) => p.category || "기타"))];
    const current = new URLSearchParams(location.search).get("cat");
    const onHome = location.pathname === `${BASE}/` || location.pathname === `${BASE}/index.html`;
    const items = [
      `<a href="${BASE}/"${onHome && !current ? ' class="active"' : ""}>전체 글</a>`,
      ...cats.map((c) =>
        `<a href="${BASE}/?cat=${encodeURIComponent(c)}"${current === c ? ' class="active"' : ""}>${escapeHtmlMenu(c)}</a>`),
    ];
    nav.innerHTML = items.join("");
  } catch { /* 메뉴를 못 불러오면 비워둔다 */ }

  function escapeHtmlMenu(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }
})();

// 푸터 블로그 공유: 모바일은 네이티브 공유 시트(카카오톡 포함), 나머지는 링크 복사
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("footer-share-btn");
  if (!btn) return;
  const SITE_URL = "https://dhamgkdltm.github.io/dhamgkdltm.gitblog.io/";
  btn.addEventListener("click", async () => {
    const original = btn.textContent;
    const done = (msg) => {
      btn.textContent = msg;
      setTimeout(() => { btn.textContent = original; }, 2000);
    };
    if (navigator.share) {
      try {
        await navigator.share({ title: "다우지의 블로그", text: "다우지의 블로그", url: SITE_URL });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return; // 공유 취소는 그대로
      }
    }
    try {
      await navigator.clipboard.writeText(SITE_URL);
      done("링크 복사됨!");
    } catch {
      done("공유 불가");
    }
  });
});
