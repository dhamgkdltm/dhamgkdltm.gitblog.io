// 글 보기 페이지: posts.json에서 글 정보를, posts/<slug>.txt에서 본문을 불러와 렌더링한다.
const BASE = "/dhamgkdltm.gitblog.io";
const slug = new URLSearchParams(location.search).get("p") || "";

async function load() {
  const mainEl = document.querySelector("main.wrap");
  let swipeDir = null;
  try {
    swipeDir = sessionStorage.getItem("post-swipe-dir");
    sessionStorage.removeItem("post-swipe-dir");
  } catch { /* 무시 */ }
  if (mainEl && swipeDir) {
    mainEl.classList.add(swipeDir === "left" ? "swipe-enter-from-right" : "swipe-enter-from-left");
  }
  const titleEl = document.getElementById("post-title");
  const contentEl = document.getElementById("post-content");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    titleEl.textContent = "글을 찾을 수 없습니다";
    return;
  }
  try {
    const reg = await (await fetch(`${BASE}/posts.json`, { cache: "no-store" })).json();
    const entry = reg.find((p) => p.slug === slug && p.published);
    if (!entry) throw new Error("not published");
    const res = await fetch(`${BASE}/posts/${slug}.txt`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const body = await res.text();
    document.title = `${entry.title} — 다우지의 블로그`;
    titleEl.textContent = entry.title;
    const dateEl = document.getElementById("post-date");
    dateEl.textContent = entry.category ? `${entry.category} · ` : "";
    dateEl.textContent += entry.date ? `게시일 ${entry.date}` : "";
    if (entry.updated && entry.date && entry.updated !== entry.date) {
      dateEl.textContent += ` · 수정일 ${entry.updated}`;
    }
    contentEl.innerHTML = marked.parse(body);
    const editLink = document.getElementById("edit-this-post");
    if (editLink) editLink.href = `${BASE}/admin.html#edit=${slug}`;
    const tagsEl = document.getElementById("post-tags");
    if (tagsEl && (entry.tags || []).length) {
      tagsEl.innerHTML = entry.tags.map((t) =>
        `<a class="tag-chip" href="${BASE}/?tag=${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`).join(" ");
    }
    wireShare(entry.title);
    loadGiscus(slug);
    wireNav(reg, slug);
    if (mainEl && swipeDir) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        mainEl.classList.add("swipe-enter-active");
        setTimeout(() => mainEl.classList.remove(
          "swipe-enter-from-right", "swipe-enter-from-left", "swipe-enter-active"), 450);
      }));
    }
  } catch {
    if (mainEl) mainEl.classList.remove(
      "swipe-enter-from-right", "swipe-enter-from-left", "swipe-enter-active");
    titleEl.textContent = "비공개 글이거나 없는 글입니다";
    contentEl.innerHTML = "";
    document.getElementById("comments").style.display = "none";
    const sb = document.querySelector(".share-box");
    if (sb) sb.style.display = "none";
  }
}

// 이전/다음 글 내비 + 본문 스와이프 (목록은 최신 순)
function wireNav(reg, slug) {
  const list = reg.filter((x) => x.published)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const idx = list.findIndex((x) => x.slug === slug);
  if (idx < 0) return;
  const newer = idx > 0 ? list[idx - 1] : null;   // 다음 글
  const older = idx < list.length - 1 ? list[idx + 1] : null; // 이전 글
  const nav = document.getElementById("post-nav");
  if (nav) {
    const link = (x, label) =>
      `<a href="${BASE}/post.html?p=${encodeURIComponent(x.slug)}"><span class="post-nav-label">${label}</span><span class="post-nav-title">${escapeHtml(x.title)}</span></a>`;
    const empty = `<span class="post-nav-empty"></span>`;
    nav.innerHTML = (older ? link(older, "← 이전 글") : empty) +
      (newer ? link(newer, "다음 글 →") : empty) +
      `<p class="post-nav-hint">글 본문을 좌우로 넘겨서 이동할 수 있어요</p>`;
  }
  const go = (dir, href) => {
    const target = href || (() => {
      const t = dir === "left" ? older : newer;
      return t ? `${BASE}/post.html?p=${encodeURIComponent(t.slug)}` : null;
    })();
    if (!target) return;
    const main = document.querySelector("main.wrap");
    if (main) main.classList.add(dir === "left" ? "swipe-exit-left" : "swipe-exit-right");
    try { sessionStorage.setItem("post-swipe-dir", dir); } catch { /* 무시 */ }
    setTimeout(() => { location.href = target; }, 260);
  };
  if (nav) {
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const p2 = new URLSearchParams(new URL(a.href).search).get("p");
        go(p2 === (older && older.slug) ? "left" : "right", a.href);
      });
    });
  }
  const article = document.querySelector(".post-body");
  if (!article) return;
  let sx = 0, sy = 0;
  article.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    sx = t.clientX; sy = t.clientY;
  }, { passive: true });
  article.addEventListener("touchend", (e) => {
    if (e.target.closest("a")) return; // 링크 터치는 그대로
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? "left" : "right");
    }
  }, { passive: true });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function wireShare(title) {
  const msg = document.getElementById("share-msg");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      if (msg) msg.textContent = "링크가 복사됐어요.";
    } catch {
      if (msg) msg.textContent = "복사에 실패했어요. 주소창의 링크를 복사해 주세요.";
    }
  };
  const shareBtn = document.getElementById("share-btn");
  if (shareBtn) shareBtn.addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url: location.href }); } catch { /* 취소 무시 */ }
    } else {
      copy();
    }
  });
  const copyBtn = document.getElementById("copy-link-btn");
  if (copyBtn) copyBtn.addEventListener("click", copy);
}

function loadGiscus(term) {
  const s = document.createElement("script");
  s.src = "https://giscus.app/client.js";
  s.async = true;
  s.crossOrigin = "anonymous";
  const attrs = {
    "data-repo": "dhamgkdltm/dhamgkdltm.gitblog.io",
    "data-repo-id": "R_kgDOVQMXpQ",
    "data-category": "General",
    "data-category-id": "DIC_kwDOVQMXpc4DJKH1",
    "data-mapping": "specific",
    "data-term": term,
    "data-strict": "0",
    "data-reactions-enabled": "1",
    "data-emit-metadata": "0",
    "data-input-position": "bottom",
    "data-theme": document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    "data-lang": "ko",
  };
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.querySelector(".giscus").appendChild(s);
}

load();
