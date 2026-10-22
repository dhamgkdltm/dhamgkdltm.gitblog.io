// 블로그 관리자: GitHub Contents API로 글을 직접 수정/삭제/공개 전환한다.
// 인증: 이 브라우저 localStorage에 저장된 fine-grained PAT (이 저장소 Contents RW만 허용할 것)
const OWNER = "dhamgkdltm";
const REPO = "dhamgkdltm.gitblog.io";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;
const TOKEN_KEY = "blog-admin-token";

const $ = (id) => document.getElementById(id);
let registry = [];       // posts.json 내용
let registrySha = null;
let editing = null;      // { slug, published, sha, isNew }
let refreshRetried = false;

const token = () => localStorage.getItem(TOKEN_KEY) || "";

async function gh(path, options = {}) {
  const res = await fetch(`${API}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub 오류 (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

const b64encode = (str) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(str)));
const b64decode = (b64) =>
  new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

async function getFile(path) {
  try {
    const data = await gh(`${path}?ref=main`);
    return { sha: data.sha, text: b64decode(data.content) };
  } catch {
    return null;
  }
}

async function putFile(path, text, message, sha) {
  const body = { message, content: b64encode(text), branch: "main" };
  if (sha) body.sha = sha;
  return gh(path, { method: "PUT", body: JSON.stringify(body) });
}

async function deleteFile(path, message, sha) {
  return gh(path, {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: "main" }),
  });
}

// ── 레지스트리(posts.json) ──────────────────────────────────────
async function loadRegistry() {
  const f = await getFile("posts.json");
  registry = f ? JSON.parse(f.text) : [];
  registrySha = f ? f.sha : null;
  renderList();
}

async function saveRegistry(message) {
  const sorted = [...registry].sort((a, b) => (a.date < b.date ? 1 : -1));
  const res = await putFile("posts.json", JSON.stringify(sorted, null, 2) + "\n", message, registrySha);
  registrySha = res.content.sha;
  registry = sorted;
}

function folderOf(published) {
  return published ? "posts" : "_drafts";
}

// ── 글 목록 ─────────────────────────────────────────────────────
function renderList() {
  const ul = $("admin-post-list");
  const sorted = [...registry].sort((a, b) => (a.date < b.date ? 1 : -1));
  ul.innerHTML = sorted.map((p) => `
    <li>
      <span class="badge ${p.published ? "pub" : "draft"}">${p.published ? "공개" : "비공개"}</span>
      <span class="admin-post-title">${escapeHtml(p.title)}</span>
      <span class="date">${escapeHtml(p.date)}</span>
      <button type="button" data-edit="${escapeHtml(p.slug)}">수정</button>
      <button type="button" data-toggle="${escapeHtml(p.slug)}">${p.published ? "비공개로" : "공개로"}</button>
    </li>`).join("") || `<li>글이 없습니다.</li>`;
  ul.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => openEditor(b.dataset.edit)));
  ul.querySelectorAll("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => togglePublished(b.dataset.toggle)));
}

async function togglePublished(slug) {
  const entry = registry.find((p) => p.slug === slug);
  if (!entry) return;
  const msg = $("admin-msg");
  msg.textContent = "전환 중…";
  try {
    const from = `${folderOf(entry.published)}/${slug}.txt`;
    const to = `${folderOf(!entry.published)}/${slug}.txt`;
    const f = await getFile(from);
    if (!f) throw new Error("원본 파일을 찾지 못했습니다.");
    await putFile(to, f.text, `공개 전환: ${entry.title}`, null);
    await deleteFile(from, `공개 전환(원본 삭제): ${entry.title}`, f.sha);
    entry.published = !entry.published;
    await saveRegistry(`공개 전환 반영: ${entry.title}`);
    msg.textContent = "전환 완료. 1분쯤 뒤 사이트에 반영됩니다.";
    renderList();
  } catch (e) {
    msg.textContent = "실패: " + e.message;
  }
}

// ── 편집기 ──────────────────────────────────────────────────────
async function openEditor(slug) {
  const entry = registry.find((p) => p.slug === slug);
  if (!entry) return;
  const f = await getFile(`${folderOf(entry.published)}/${slug}.txt`);
  if (!f) { $("admin-msg").textContent = "파일을 불러오지 못했습니다."; return; }
  editing = { slug, published: entry.published, sha: f.sha, isNew: false, date: entry.date };
  $("f-title").value = entry.title;
  $("f-published").checked = entry.published;
  $("f-body").value = f.text.trim();
  $("editor-title").textContent = "글 편집";
  $("delete-post").style.display = "";
  $("editor").hidden = false;
  $("editor").scrollIntoView({ behavior: "smooth" });
}

function nowKST() {
  return new Date(Date.now() + 9 * 3600 * 1000);
}
function todayKST() {
  return nowKST().toISOString().slice(0, 10);
}
function autoSlug() {
  const d = nowKST();
  const base = "post-" + d.toISOString().slice(0, 10).replace(/-/g, "") +
    "-" + String(d.getUTCHours()).padStart(2, "0") + String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0");
  let slug = base, n = 2;
  while (registry.some((p) => p.slug === slug)) slug = `${base}-${n++}`;
  return slug;
}
function autoExcerpt(body) {
  const text = body
    .replace(/<[^>]*>/g, " ")
    .replace(/[#>*`_~[\]()!|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 90 ? text.slice(0, 90) + "…" : text;
}

function openNew() {
  editing = { slug: null, published: false, sha: null, isNew: true, date: null };
  $("f-title").value = "";
  $("f-published").checked = false;
  $("f-body").value = "";
  $("editor-title").textContent = "새 글 쓰기";
  $("delete-post").style.display = "none";
  $("editor").hidden = false;
  $("editor").scrollIntoView({ behavior: "smooth" });
}

async function savePost() {
  const msg = $("editor-msg");
  const title = $("f-title").value.trim();
  const published = $("f-published").checked;
  const body = $("f-body").value;
  if (!title) { msg.textContent = "제목을 입력해 주세요."; return; }
  if (!body.trim()) { msg.textContent = "본문을 입력해 주세요."; return; }
  const slug = editing.isNew ? autoSlug() : editing.slug;
  const date = editing.isNew ? todayKST() : editing.date;
  const excerpt = autoExcerpt(body);
  msg.textContent = "저장 중…";
  try {
    const md = body.trim() + "\n";
    const newPath = `${folderOf(published)}/${slug}.txt`;
    if (editing.isNew) {
      if (registry.some((p) => p.slug === slug)) throw new Error("이미 있는 주소(slug)입니다.");
      await putFile(newPath, md, `새 글: ${title}`, null);
      registry.push({ slug, title, date, excerpt, published });
    } else {
      const oldPath = `${folderOf(editing.published)}/${slug}.txt`;
      if (editing.published !== published) {
        await putFile(newPath, md, `글 수정: ${title}`, null);
        await deleteFile(oldPath, `글 수정(이전 위치 삭제): ${title}`, editing.sha);
      } else {
        await putFile(newPath, md, `글 수정: ${title}`, editing.sha);
      }
      Object.assign(registry.find((p) => p.slug === slug), { title, date, excerpt, published });
    }
    await saveRegistry(`글 저장 반영: ${title}`);
    msg.textContent = "저장 완료. 1분쯤 뒤 사이트에 반영됩니다.";
    editing = null;
    $("editor").hidden = true;
    renderList();
  } catch (e) {
    msg.textContent = "실패: " + e.message;
  }
}

async function deletePost() {
  if (!editing || editing.isNew) return;
  if (!confirm("이 글을 완전히 삭제할까요?")) return;
  const msg = $("editor-msg");
  msg.textContent = "삭제 중…";
  try {
    const path = `${folderOf(editing.published)}/${editing.slug}.txt`;
    const f = await getFile(path);
    if (f) await deleteFile(path, `글 삭제: ${editing.slug}`, f.sha);
    registry = registry.filter((p) => p.slug !== editing.slug);
    await saveRegistry(`글 삭제 반영: ${editing.slug}`);
    editing = null;
    $("editor").hidden = true;
    $("admin-msg").textContent = "삭제 완료.";
    renderList();
  } catch (e) {
    msg.textContent = "실패: " + e.message;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

// ── 시작/토큰 ───────────────────────────────────────────────────
async function init() {
  if (!token()) {
    $("token-gate").hidden = false;
    $("admin-main").hidden = true;
    return;
  }
  try {
    await gh("posts.json?ref=main");
    $("token-gate").hidden = true;
    $("admin-main").hidden = false;
    await loadRegistry();
    const m = location.hash.match(/#edit=(.+)/);
    if (m) openEditor(decodeURIComponent(m[1]));
  } catch (e) {
    if (!refreshRetried && window.refreshAuthToken && await window.refreshAuthToken()) {
      refreshRetried = true;
      return init();
    }
    
    $("token-gate").hidden = false;
    $("admin-main").hidden = true;
    $("token-msg").textContent = "토큰이 올바르지 않거나 권한이 없습니다.";
  }
}

$("token-save").addEventListener("click", () => {
  const v = $("token-input").value.trim();
  if (!v) return;
  localStorage.setItem(TOKEN_KEY, v);
  init();
});
$("new-post").addEventListener("click", openNew);
$("save-post").addEventListener("click", savePost);
$("delete-post").addEventListener("click", deletePost);
$("cancel-edit").addEventListener("click", () => { $("editor").hidden = true; editing = null; });

init();
