// 테스트 우주 (space.html 전용)
// 셀 시스템: 100x100 셀, 셀 한 칸 = 면적이 있는 공간(화면 72px).
// 중심 셀(50,50) = 루미라, 위성 = 글 테마(카테고리), 방문자 = 화면 중심에 고정된 혜성.
// 이동은 드래그가 아니다. 화면을 누르고 있으면, 화면 중심에서 누른 지점을 향한 방향으로
// 혜성이 이동한다. 속도는 누른 위치와 화면 중심 사이의 거리에 비례한다. 떼면 멈춘다.
// 꼬리는 이동 방향의 반대로 길게 흐른다. 테마 위성은 루미라를 기준으로 공전한다.
// 조회수는 읽기 전용 GET /count만 쓴다(/hit 호출 금지).
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
// 터치 스티어링: 누르고 있는 지점 방향으로 이동, 속도는 화면 중심과의 거리 비례.
let steering = false, steerId = null, steerX = 0, steerY = 0, lastT = 0;
const satellites = []; // { el, radius(셀), angle, speed(라디안/초) }

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
  const len = 60 + Math.min(170, speed * 0.35);
  tailEl.style.width = `${len}px`;
  tailEl.style.transform = `rotate(${tailAngle}rad)`;
}
function loop(t) {
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016);
  lastT = t;
  if (steering) {
    // 방향 = 화면 중심 → 누른 지점, 속도 = 중심과의 거리 비례 (최대 620px/초 ≈ 8.6셀/초)
    const dx = steerX - window.innerWidth / 2;
    const dy = steerY - window.innerHeight / 2;
    const dist = Math.hypot(dx, dy);
    if (dist > 24) {
      const speed = Math.min(dist * 2.2, 620);
      const step = speed * dt;
      posX += (dx / dist) * step;
      posY += (dy / dist) * step;
      clampPos();
      vx = vx * 0.7 + (dx / dist) * speed * 0.3;
      vy = vy * 0.7 + (dy / dist) * speed * 0.3;
    } else { vx *= 0.85; vy *= 0.85; }
  } else { vx *= 0.88; vy *= 0.88; }
  // 테마 위성 공전: 루미라 중심 기준 원궤도
  for (const s of satellites) {
    s.angle += s.speed * dt;
    const px = (CENTER + 0.5) * CELL + Math.cos(s.angle) * s.radius * CELL;
    const py = (CENTER + 0.5) * CELL + Math.sin(s.angle) * s.radius * CELL;
    s.el.style.left = `${px - CELL / 2}px`;
    s.el.style.top = `${py - CELL / 2}px`;
  }
  render();
  requestAnimationFrame(loop);
}

// 스티어링: 빈 공간을 누른 채로 있으면 그 방향으로 이동. 노드를 누른 건 클릭(팝업)용.
viewport.addEventListener("pointerdown", (e) => {
  if (e.target.closest && e.target.closest(".node")) return;
  steering = true; steerId = e.pointerId; steerX = e.clientX; steerY = e.clientY;
  closePopup();
  if (!hintHidden) { hintEl.classList.add("gone"); hintHidden = true; }
  if (viewport.setPointerCapture) {
    try { viewport.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
  }
});
viewport.addEventListener("pointermove", (e) => {
  if (!steering || e.pointerId !== steerId) return;
  steerX = e.clientX; steerY = e.clientY;
});
function endSteer(e) {
  if (e.pointerId !== steerId) return;
  steering = false; steerId = null;
}
viewport.addEventListener("pointerup", endSteer);
viewport.addEventListener("pointercancel", endSteer);

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
    // 공전 파라미터: 배치된 셀에서 중심까지의 거리 = 궤도 반지름, 그 방향 = 시작 각도
    const radius = Math.hypot(col - CENTER, row - CENTER);
    const angle = Math.atan2(row - CENTER, col - CENTER);
    const period = 40 + radius * 6; // 초, 큰 궤도일수록 느리게
    satellites.push({ el: btn, radius, angle, speed: (Math.PI * 2) / period });
    nodesEl.appendChild(btn);
  });

  statusEl.textContent = "";
  render();
  requestAnimationFrame(loop);
}
main();
