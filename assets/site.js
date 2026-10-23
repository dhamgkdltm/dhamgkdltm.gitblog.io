// 홈: 글 목록 + 종류/태그 모아보기 + 검색(제목·본문·태그·종류)
const BASE = "/dhamgkdltm.gitblog.io";
const params = new URLSearchParams(location.search);
const catParam = params.get("cat");
const tagParam = params.get("tag");
const qParam = (params.get("q") || "").trim();

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function postItem(p, extra = "") {
  const tags = (p.tags || []).map((t) =>
    `<a class="tag-chip" href="${BASE}/?tag=${encodeURIComponent(t)}">#${escapeHtml(t)}</a>`).join(" ");
  return `
    <li>
      <span class="post-cat">${escapeHtml(p.category || "기타")}</span>
      <a href="${BASE}/post.html?p=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
      <span class="date">${escapeHtml(p.date)}</span>
      <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
      ${extra}
      ${tags ? `<p class="post-tags">${tags}</p>` : ""}
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

  if (catParam) {
    heading.textContent = catParam;
    const list = posts.filter((p) => (p.category || "기타") === catParam);
    ul.innerHTML = list.map((p) => postItem(p)).join("") ||
      `<li>이 종류의 글이 아직 없습니다.</li>`;
    return;
  }
  if (tagParam) {
    heading.textContent = `#${tagParam}`;
    const list = posts.filter((p) => (p.tags || []).includes(tagParam));
    ul.innerHTML = list.map((p) => postItem(p)).join("") ||
      `<li>이 태그의 글이 아직 없습니다.</li>`;
    return;
  }
  if (qParam) {
    heading.textContent = `검색: ${qParam}`;
    status.textContent = "검색 중…";
    const q = qParam.toLowerCase();
    const results = [];
    for (const p of posts) {
      const inMeta = [p.title, p.excerpt || "", p.category || "", ...(p.tags || [])]
        .join(" ").toLowerCase().includes(q);
      let snippet = "";
      if (!inMeta) {
        try {
          const body = await (await fetch(`${BASE}/posts/${p.slug}.txt`, { cache: "no-store" })).text();
          const plain = body.replace(/<[^>]*>/g, " ").replace(/[#>*`_~[\]()!|-]/g, " ").replace(/\s+/g, " ");
          const idx = plain.toLowerCase().indexOf(q);
          if (idx >= 0) {
            const start = Math.max(0, idx - 40);
            snippet = (start > 0 ? "…" : "") + plain.slice(start, idx + qParam.length + 60) + "…";
          }
        } catch { /* 본문을 못 읽으면 건너뜀 */ }
      }
      if (inMeta || snippet) {
        results.push(postItem(p, snippet ? `<p class="excerpt search-snippet">${escapeHtml(snippet)}</p>` : ""));
      }
    }
    status.textContent = `검색 결과 ${results.length}개`;
    ul.innerHTML = results.join("") || `<li>검색 결과가 없습니다.</li>`;
    return;
  }

  heading.textContent = "최근 글";
  ul.innerHTML = posts.map((p) => postItem(p)).join("") ||
    `<li>아직 공개된 글이 없습니다.</li>`;
}

main();
