// 조회수: 주인(로그인 상태) 제외 + 방문자별 하루 1회만 집계
(function () {
  const API = "https://blog-counter.dhamgkdltm.workers.dev";
  const isOwner = !!localStorage.getItem("blog-admin-token");
  let vid = null;
  try {
    vid = localStorage.getItem("blog-vid");
    if (!vid) {
      vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("blog-vid", vid);
    }
  } catch { /* 저장 불가 환경이면 집계 생략 */ }

  async function showCount(slug, el) {
    if (!el || !vid) return;
    try {
      let data;
      if (isOwner) {
        const res = await fetch(`${API}/count?slug=${encodeURIComponent(slug)}`);
        data = await res.json();
      } else {
        const res = await fetch(`${API}/hit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, vid }),
        });
        data = await res.json();
      }
      if (typeof data.count === "number") {
        el.textContent = data.count.toLocaleString("ko-KR");
      }
    } catch { /* 카운터에 닿지 않으면 표시 생략 */ }
  }

  document.addEventListener("DOMContentLoaded", () => {
    showCount("__site__", document.getElementById("site-visit-count"));
    const postEl = document.getElementById("post-view-count");
    if (postEl) {
      const slug = new URLSearchParams(location.search).get("p");
      if (slug) showCount(slug, postEl);
    }
  });
})();
