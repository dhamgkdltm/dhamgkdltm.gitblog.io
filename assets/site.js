// 홈: 글 목록 + 종류/태그 모아보기 + 검색(제목·본문·태그·종류)
const BASE = "/dhamgkdltm.gitblog.io";
const COUNTER_API = "https://blog-counter.dhamgkdltm.workers.dev";
const params = new URLSearchParams(location.search);
const catParam = params.get("cat");
const tagParam = params.get("tag");
const qParam = (params.get("q") || "").trim();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

const CAT_FIXED = { "가이드": "#dbeafe", "게임": "#dcfce7", "일상": "#fef3c7", "방송": "#fae8ff", "기타": "#e8eaf0", "과학": "#dbeafe", "기술": "#e0e7ff", "철학": "#ede9fe", "인문학": "#fef3c7", "애니메이션": "#fce7f3", "호기심": "#ccfbf1" };
const CAT_PALETTE = ["#dbeafe", "#dcfce7", "#fef3c7", "#fae8ff", "#ffe4e6", "#e0e7ff", "#ffedd5", "#ccfbf1"];
function catColor(cat) {
  const c = cat || "기타";
  if (CAT_FIXED[c]) return CAT_FIXED[c];
  let h = 0;
  for (const ch of c) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return CAT_PALETTE[h % CAT_PALETTE.length];
}
function extractThumb(md) {
  const m = md.match(/!\[[^\]]*\]\((https?:[^)\s]+)\)/) || md.match(/<img[^>]+src="(https?:[^"]+)"/i);
  return m ? m[1] : "";
}
async function fillThumbs(posts) {
  for (const p of posts) {
    if (p.thumb) continue;
    const boxes = [...document.querySelectorAll(`.post-thumb[data-slug="${CSS.escape(p.slug)}"]`)]
      .filter((box) => !box.querySelector("img"));
    if (!boxes.length) continue;
    try {
      const res = await fetch(`${BASE}/posts/${p.slug}.txt`, { cache: "no-store" });
      if (!res.ok) continue;
      const url = extractThumb(await res.text());
      if (!url) continue;
      for (const box of boxes) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        img.loading = "lazy";
        box.appendChild(img);
      }
    } catch { /* 썸네일 없이 표시 */ }
  }
}

function postItem(p, extra = "") {
  const tags = (p.tags || []).map((t) =>
    `<a class="tag-chip" href="${BASE}/?tag=${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`).join(" ");
  const thumbImg = p.thumb ? `<img src="${escapeHtml(p.thumb)}" alt="" loading="lazy">` : "";
  return `
    <li class="post-card" style="--cat-bg:${catColor(p.category)}">
      <div class="post-thumb" data-slug="${escapeHtml(p.slug)}"><span class="post-thumb-icon">🤖</span>${thumbImg}</div>
      <div class="post-info">
        <span class="post-cat">${escapeHtml(p.category || "기타")}</span>
        <a class="post-title" href="${BASE}/post.html?p=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
        <span class="date">${escapeHtml(p.date)}</span>
        <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
        ${extra}
        ${tags ? `<p class="post-tags">${tags}</p>` : ""}
      </div>
    </li>`;
}

async function main() {
  const ul = document.getElementById("post-list");
  const heading = document.getElementById("list-heading");
  const status = document.getElementById("list-status");
  const searchInput = document.getElementById("search-input");
  if (searchInput && qParam) searchInput.value = qParam;
  let posts;
  try {
    const res = await fetch(`${BASE}/posts.json`, { cache: "no-store" });
    posts = (await res.json())
      .filter((p) => p.published)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    ul.innerHTML = `<li>글 목록을 불러오지 못했습니다.</li>`;
    return;
  }

  if (catParam || tagParam || qParam) {
    const intro = document.querySelector(".intro-box");
    if (intro) intro.remove();
  }
  if (catParam) {
    heading.textContent = catParam;
    const list = posts.filter((p) => (p.category || "기타") === catParam);
    ul.innerHTML = list.map((p) => postItem(p)).join("") ||
      `<li>이 종류의 글이 아직 없습니다.</li>`;
    fillThumbs(list);
    return;
  }
  if (tagParam) {
    heading.textContent = `#${tagParam}`;
    const list = posts.filter((p) => (p.tags || []).includes(tagParam));
    ul.innerHTML = list.map((p) => postItem(p)).join("") ||
      `<li>이 태그의 글이 아직 없습니다.</li>`;
    fillThumbs(list);
    return;
  }
  if (qParam) {
    heading.textContent = `검색: ${qParam}`;
    status.textContent = "검색 중…";
    const q = qParam.toLowerCase();
    const results = [];
    const matched = [];
    for (const p of posts) {
      const inMeta = [p.title, p.excerpt || "", p.category || "", ...(p.tags || [])]
        .join(" ").toLowerCase().includes(q);
      let snippet = "";
      if (!inMeta) {
        try {
          const body = await (await fetch(`${BASE}/posts/${p.slug}.txt`, { cache: "no-store" })).text();
          const plain = body
            .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
            .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
            .replace(/https?:\/\/\S+/g, " ")
            .replace(/<[^>]*>/g, " ").replace(/[#>*`_~[\]()!|-]/g, " ").replace(/\s+/g, " ");
          const idx = plain.toLowerCase().indexOf(q);
          if (idx >= 0) {
            const start = Math.max(0, idx - 40);
            snippet = (start > 0 ? "…" : "") + plain.slice(start, idx + qParam.length + 60) + "…";
          }
        } catch { /* 본문을 못 읽으면 건너뜀 */ }
      }
      if (inMeta || snippet) {
        matched.push(p);
        results.push(postItem(p, snippet ? `<p class="excerpt search-snippet">${escapeHtml(snippet)}</p>` : ""));
      }
    }
    status.textContent = `검색 결과 ${results.length}개`;
    ul.innerHTML = results.join("") || `<li>검색 결과가 없습니다.</li>`;
    fillThumbs(matched);
    return;
  }

  heading.textContent = "최근 글";
  ul.innerHTML = posts.map((p) => postItem(p)).join("") ||
    `<li>아직 공개된 글이 없습니다.</li>`;
  fillThumbs(posts);
  loadPopular(posts);
}

// 인기 글 TOP 5: 글별 조회수(/count, 공개 엔드)를 모아 상위 5개 표시.
// /stats는 소유자 토큰이 필요해서 공개 페이지에서 쓸 수 없으므로 글별 /count를 쓴다.
// 통계가 안 오면(실패·조회수 0) 섹션을 조용히 숨긴다.
async function loadPopular(posts) {
  const section = document.getElementById("popular-section");
  const list = document.getElementById("popular-list");
  if (!section || !list || !posts.length) return;
  let counts;
  try {
    counts = await Promise.all(posts.map(async (p) => {
      const res = await fetch(`${COUNTER_API}/count?slug=${encodeURIComponent(p.slug)}`);
      if (!res.ok) throw new Error("count failed");
      const data = await res.json();
      return { post: p, count: typeof data.count === "number" ? data.count : 0 };
    }));
  } catch { return; /* 통계 로드 실패: 섹션 숨김 유지 */ }
  const top = counts
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  if (!top.length) return;
  list.innerHTML = top.map((c, i) => postItem(c.post,
    `<span class="popular-rank" aria-label="${i + 1}위">${i + 1}</span>` +
    `<span class="popular-views">조회 ${c.count.toLocaleString("ko-KR")}</span>`)).join("");
  section.hidden = false;
  fillThumbs(top.map((c) => c.post));
}

main().finally(() => window.loadGoogleTranslate?.());
