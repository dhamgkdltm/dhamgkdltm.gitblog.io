// 글 보기 페이지: posts.json에서 글 정보를, posts/<slug>.txt에서 본문을 불러와 렌더링한다.
const BASE = "/dhamgkdltm.gitblog.io";
const slug = new URLSearchParams(location.search).get("p") || "";

async function load() {
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
    document.getElementById("post-date").textContent = entry.date || "";
    contentEl.innerHTML = marked.parse(body);
    loadGiscus(slug);
  } catch {
    titleEl.textContent = "비공개 글이거나 없는 글입니다";
    contentEl.innerHTML = "";
    document.getElementById("comments").style.display = "none";
  }
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
    "data-theme": "light",
    "data-lang": "ko",
  };
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.querySelector(".giscus").appendChild(s);
}

load();
