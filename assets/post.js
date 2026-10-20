// 글 보기 페이지: posts/<slug>.md 를 불러와 렌더링한다.
const BASE = "/dhamgkdltm.gitblog.io";
const slug = new URLSearchParams(location.search).get("p") || "";

function parseFrontMatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  let body = md;
  if (m) {
    body = md.slice(m[0].length);
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { meta, body };
}

async function load() {
  const titleEl = document.getElementById("post-title");
  const contentEl = document.getElementById("post-content");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    titleEl.textContent = "글을 찾을 수 없습니다";
    return;
  }
  try {
    const res = await fetch(`${BASE}/posts/${slug}.md`, { cache: "no-store" });
    if (!res.ok) throw new Error("not found");
    const { meta, body } = parseFrontMatter(await res.text());
    document.title = `${meta.title || slug} — 다우지의 블로그`;
    titleEl.textContent = meta.title || slug;
    document.getElementById("post-date").textContent = meta.date || "";
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
