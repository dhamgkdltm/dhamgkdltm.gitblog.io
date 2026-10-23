// 홈: posts.json에서 공개 글 목록을 렌더링한다.
const BASE = "/dhamgkdltm.gitblog.io";

let allPosts = [];
let activeCategory = "전체";

async function renderList() {
  const ul = document.getElementById("post-list");
  if (!ul) return;
  try {
    const res = await fetch(`${BASE}/posts.json`, { cache: "no-store" });
    allPosts = (await res.json())
      .filter((p) => p.published)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    renderCategoryMenu();
    renderPosts();
  } catch {
    ul.innerHTML = `<li>글 목록을 불러오지 못했습니다.</li>`;
  }
}

function renderCategoryMenu() {
  const menu = document.getElementById("category-menu");
  if (!menu) return;
  const cats = ["전체", ...new Set(allPosts.map((p) => p.category || "기타"))];
  menu.innerHTML = cats.map((c) =>
    `<button type="button" class="chip${c === activeCategory ? " active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join("");
  menu.querySelectorAll("[data-cat]").forEach((b) =>
    b.addEventListener("click", () => {
      activeCategory = b.dataset.cat;
      renderCategoryMenu();
      renderPosts();
    }));
}

function renderPosts() {
  const ul = document.getElementById("post-list");
  const posts = activeCategory === "전체"
    ? allPosts
    : allPosts.filter((p) => (p.category || "기타") === activeCategory);
  ul.innerHTML = posts.map((p) => `
    <li>
      <span class="post-cat">${escapeHtml(p.category || "기타")}</span>
      <a href="${BASE}/post.html?p=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>
      <span class="date">${escapeHtml(p.date)}</span>
      <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
    </li>`).join("") || `<li>이 종류의 글이 아직 없습니다.</li>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

renderList();
