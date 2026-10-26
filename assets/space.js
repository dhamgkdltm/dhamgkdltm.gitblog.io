// 테스트 우주 (space.html 전용)
// 셀 시스템: 100x100 셀, 셀 한 칸 = 면적이 있는 공간(화면 72px).
// 중심 셀(50,50) = 루미라, 위성 = 글 테마(카테고리), 방문자 = 화면 중심에 고정된 혜성.
// 드래그한 방향으로 혜성이 이동하고, 세상이 반대로 움직여 혜성이 항상 중심에 머문다.
// 꼬리는 이동 방향의 반대로 흐른다. 조회수는 읽기 전용 GET /count만 쓴다(/hit 호출 금지).
const BASE = "/dhamgkdltm.gitblog.io";
const API = "https://blog-counter.dhamgkdltm.workers.dev";
const CELL = 72, WORLD = 100, CENTER = 50;

const CAT_FIXED = { "가이드": "#dbeafe", "게임": "#dcfce7", "일상": "#fef3c7", "방송": "#fae8ff", "기타": "#e8eaf0", "과학": "#dbeafe", "기술": "#e0e7ff", "철학": "#ede9fe", "인문학": "#fef3c7", "애니메이션": "#fce7f3", "호기심": "#ccfbf1" };
const CAT_PALETTE = ["#dbeafe", "#dcfce7", "#fef3c7", "#fae8ff", "#ffe4e6", "#e0e7ff", "#ffedd5", "#ccfbf1"];
function catColor(cat) {
  if (CAT_FIXED[cat]) return CAT_FIXED[cat];
  let h = 0;
  for (const ch of cat) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return CAT_PALETTE[h % CAT_PALETTE.length];
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
// 결정적 난수 (별 배치용)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const viewport = document.getElementById("space-viewport");
const worldEl = document.getElementById("world");
const nodesEl = document.getElementById("nodes");
const starsEl = document.getElementById("stars");
const readoutEl = document.getElementById("readout");
const statusEl = document.getElementById("space-status");
const hintEl = document.getElementById("hint");
const popupEl = document.getElementById("popup");
const tailEl = document.getElementById("comet-tail");

// 혜성 위치 (월드 내 px, 혜성 중심 기준). 시작 셀: 루미라 남쪽 5칸 (50,55).
let posX = (CENTER + 0.5) * CELL;
let posY = (55 + 0.5) * CELL;
let vx = 0, vy = 0, tailAngle = Math.PI, hintHidden = false;
let dragging = false, captured = false, lastX = 0, lastY = 0, moved = 0;

function clampPos() {
  const m = CELL / 2;
  posX = Math.max(m, Math.min(WORLD * CELL - m, posX));
  posY = Math.max(m, Math.min(WORLD * CELL - m, posY));
}
function currentCell() {
  return { col: Math.floor(posX / CELL), row: Math.floor(posY / CELL) };
}
function render() {
  worldEl.style.transform =
    `translate(${window.innerWidth / 2 - posX}px, ${window.innerHeight / 2 - posY}px)`;
  const { col, row } = currentCell();
  const dx = col - CENTER, dy = row - CENTER;
  let rel;
  if (dx === 0 && dy === 0) rel = "루미라와 같은 셀";
  else {
    // 북 = 위(행 감소). 8방위 화살표.
    const ang = Math.atan2(-dy, dx);
    const dirs = ["→", "↗", "↑", "↖", "←", "↙", "↓", "↘"];
    const idx = Math.round(ang / (Math.PI / 4));
    const arrow = dirs[((idx % 8) + 8) % 8];
    rel = `루미라 기준 ${arrow} ${Math.max(Math.abs(dx), Math.abs(dy))}칸`;
  }
  readoutEl.textContent = `${rel} · 현재 셀 (${col}, ${row})`;
  const speed = Math.hypot(vx, vy);
  if (speed > 0.4) tailAngle = Math.atan2(vy, vx) + Math.PI;
  const len = 26 + Math.min(110, speed * 2.4);
  tailEl.style.width = `${len}px`;
  tailEl.style.transform = `rotate(${tailAngle}rad)`;
}
function loop() {
  if (!dragging) { vx *= 0.88; vy *= 0.88; }
  render();
  requestAnimationFrame(loop);
}

viewport.addEventListener("pointerdown", (e) => {
  lastX = e.clientX; lastY = e.clientY; moved = 0; dragging = false; captured = false;
});
viewport.addEventListener("pointermove", (e) => {
  if (e.buttons === 0 && lastX === 0 && lastY === 0) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  if (!dragging && Math.hypot(dx, dy) === 0) return;
  moved += Math.hypot(dx, dy);
  if (!dragging && moved > 6) {
    dragging = true;
    viewport.classList.add("dragging");
    if (!captured && viewport.setPointerCapture) {
      try { viewport.setPointerCapture(e.pointerId); captured = true; } catch { /* 무시 */ }
    }
  }
  if (!dragging) return;
  // 드래그한 방향으로 혜성이 이동 → 세상은 반대로 움직여 혜성이 중심에 머무른다.
  posX += dx; posY += dy; clampPos();
  vx = vx * 0.6 + dx * 0.4; vy = vy * 0.6 + dy * 0.4;
  if (!hintHidden) { hintEl.classList.add("gone"); hintHidden = true; }
});
function endDrag() {
  dragging = false; viewport.classList.remove("dragging");
  lastX = 0; lastY = 0;
}
viewport.addEventListener("pointerup", endDrag);
viewport.addEventListener("pointercancel", endDrag);

function closePopup() { popupEl.hidden = true; }
document.getElementById("popup-close").addEventListener("click", closePopup);
function openPopup(title, meta, bodyHtml) {
  document.getElementById("popup-title").textContent = title;
  document.getElementById("popup-meta").textContent = meta;
  document.getElementById("popup-body").innerHTML = bodyHtml;
  popupEl.hidden = false;
  if (!hintHidden) { hintEl.classList.add("gone"); hintHidden = true; }
}

// 별 배경
(function drawStars() {
  const rand = mulberry32(20261026);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 340; i++) {
    const s = document.createElement("span");
    s.className = "star";
    const size = rand() < 0.12 ? 2 : 1;
    s.style.cssText = `left:${Math.floor(rand() * WORLD * CELL)}px;top:${Math.floor(rand() * WORLD * CELL)}px;width:${size}px;height:${size}px;opacity:${(0.3 + rand() * 0.6).toFixed(2)};`;
    frag.appendChild(s);
  }
  starsEl.appendChild(frag);
})();

// 테마 위성 배치: 황금각 나선으로 중심 바깥쪽에 셀 단위로 퍼뜨리기 (셀 중복 없음)
function placeCells(n) {
  const taken = new Set([`${CENTER},${CENTER}`]);
  const out = [];
  const GOLDEN = 2.399963;
  for (let i = 0; i < n; i++) {
    let radius = 9 + i * 2.4, col = CENTER, row = CENTER;
    for (let t = 0; t < 30; t++) {
      const a = i * GOLDEN;
      col = Math.max(2, Math.min(97, Math.round(CENTER + Math.cos(a) * radius)));
      row = Math.max(2, Math.min(97, Math.round(CENTER + Math.sin(a) * radius)));
      if (!taken.has(`${col},${row}`)) break;
      radius += 1.5;
    }
    taken.add(`${col},${row}`);
    out.push({ col, row });
  }
  return out;
}

async function main() {
  statusEl.textContent = "글을 불러오는 중…";
  let posts;
  try {
    const res = await fetch(`${BASE}/posts.json`, { cache: "no-store" });
    posts = (await res.json()).filter((p) => p.published)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    statusEl.textContent = "글 목록을 불러오지 못했습니다.";
    return;
  }
  // 조회수 합계 (읽기 전용 GET만 사용 — /hit을 부르면 테스트 방문이 조회수를 부풀린다)
  const counts = await Promise.allSettled(
    posts.map((p) => fetch(`${API}/count?slug=${encodeURIComponent(p.slug)}`).then((r) => r.json()))
  );
  let viewsOk = false;
  const viewsBySlug = {};
  posts.forEach((p, i) => {
    const v = counts[i].status === "fulfilled" && typeof counts[i].value.count === "number"
      ? counts[i].value.count : null;
    if (v !== null) viewsOk = true;
    viewsBySlug[p.slug] = v;
  });

  const groups = new Map();
  for (const p of posts) {
    const cat = p.category || "기타";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(p);
  }
  const cats = [...groups.keys()];
  const cells = placeCells(cats.length);

  // 중심: 루미라 프로필 노드
  const centerBtn = document.createElement("button");
  centerBtn.className = "node node-center";
  centerBtn.type = "button";
  centerBtn.style.cssText = `left:${CENTER * CELL}px;top:${CENTER * CELL}px;`;
  centerBtn.setAttribute("aria-label", "루미라 프로필");
  centerBtn.innerHTML = `<span class="orb"></span><span class="node-label">루미라</span><span class="node-sub">공간의 중심</span>`;
  centerBtn.addEventListener("click", () => openPopup(
    "루미라",
    "이 공간의 중심",
    `<div class="popup-profile">안녕하세요, 루미라입니다.<br>만들고, 놀고, 기록하는 걸 좋아해요. 이곳은 제가 이것저것 모아두는 공간입니다.<br><br><a href="${BASE}/">🏠 글 목록 홈으로 가기</a></div>`
  ));
  nodesEl.appendChild(centerBtn);

  cats.forEach((cat, i) => {
    const list = groups.get(cat);
    const views = list.reduce((s, p) => s + (viewsBySlug[p.slug] || 0), 0);
    const metric = viewsOk ? views : list.length;
    const size = 34 + Math.min(48, viewsOk
      ? Math.round(10 * Math.log10(1 + metric))
      : Math.min(40, metric * 5));
    const tier = viewsOk ? (metric >= 50 ? "splendid" : metric >= 10 ? "glow" : "") :
      (metric >= 4 ? "splendid" : metric >= 2 ? "glow" : "");
    const color = catColor(cat);
    const { col, row } = cells[i];
    const btn = document.createElement("button");
    btn.className = `node${tier === "splendid" ? " node-splendid" : ""}`;
    btn.type = "button";
    btn.style.cssText = `left:${col * CELL}px;top:${row * CELL}px;--glow:${color};`;
    btn.setAttribute("aria-label", `${cat} 테마, 글 ${list.length}개`);
    btn.innerHTML = `<span class="orb" style="width:${size}px;height:${size}px;background:radial-gradient(circle at 38% 35%, #ffffff, ${color} 55%, ${color});"></span>` +
      `<span class="node-label">${escapeHtml(cat)}</span>` +
      `<span class="node-sub">글 ${list.length}개</span>`;
    btn.addEventListener("click", () => {
      const meta = viewsOk
        ? `글 ${list.length}개 · 조회수 합계 ${views.toLocaleString("ko-KR")}`
        : `글 ${list.length}개 · 조회수 정보를 불러오지 못했어요`;
      const body = list.map((p) =>
        `<div class="popup-post"><a href="${BASE}/post.html?p=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a>` +
        `<span class="popup-date">${escapeHtml(p.date)}</span>` +
        `<p>${escapeHtml(p.excerpt || "")}</p></div>`).join("") +
        `<div class="popup-post"><a href="${BASE}/?cat=${encodeURIComponent(cat)}">이 테마 글 목록 전체 보기 →</a></div>`;
      openPopup(cat, meta, body);
    });
    nodesEl.appendChild(btn);
  });

  statusEl.textContent = "";
  render();
  loop();
}
main();
