// 홈: posts.json에서 공개 글 목록을 렌더링한다.
const BASE = "/dhamgkdltm.gitblog.io";

async function renderList() {
  const ul = document.getElementById("post-list");
  if (!ul) return;
  try {
    const res = await fetch(`${BASE}/posts.json`, { cache: "no-store" });
    const posts = (await res.json())
      .filter((p) => p.published)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    ul.innerHTML = posts.map((p) => `
      <li>
        <a href="${BASE}/post.html?p=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
        <span class="date">${escapeHtml(p.date)}</span>
        <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
      </li>`).join("") || `<li>아직 공개된 글이 없습니다.</li>`;
  } catch {
    ul.innerHTML = `<li>글 목록을 불러오지 못했습니다.</li>`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

renderList();
