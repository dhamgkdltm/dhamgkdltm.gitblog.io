// 테스트 우주 (space.html 전용)
// 셀 시스템: 100x100 셀, 셀 한 칸 = 면적이 있는 공간(화면 72px).
// 중심 셀(50,50) = 루미라의 계. 루미라의 계(태양계처럼)는 하나의 셀이고,
// 좌표는 계 단위로 하나다. 테마 위성은 따로 좌표를 갖지 않고 루미라의 계 안에서 공전한다.
// 공전주기는 케플러식(주기 ∝ 반지름^1.5)으로, 바깥 궤도일수록 확실히 길다.
// 방문자 = 화면 중심에 고정된 혜성.
// 이동은 가상 조이스틱 + 물리엔진: 빈 곳을 누른 지점이 기준점, 끄는 방향이 목표 속도.
// 속도는 목표를 향해 가속으로 다가가고, 손을 떼면 천천히 감속하며 미끄러지듯 멈춘다(관성).
// 꼬리는 딱딱한 직선이 아니라, 혜성이 지나온 길을 따라 휘어지며 흐릿해지는 궤적이다.
// v6: 파일명을 바꿔 오래된 캐시가 구버전 스크립트를 물지 않게 함.
// 루프는 다음 프레임을 먼저 예약하고, 한 프레임이 죽어도 멈추지 않게 보호한다.
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
const joyEl = document.getElementById("joystick");
const joyKnob = document.getElementById("joy-knob");
const trailSvg = document.getElementById("trail-svg");
// 필수 요소가 하나라도 없으면 조용히 멈추지 말고 화면에 알린다
if ((!viewport || !worldEl || !nodesEl || !starsEl || !readoutEl || !statusEl || !hintEl || !popupEl || !joyEl || !joyKnob) && statusEl) {
  statusEl.textContent = "필수 요소를 찾지 못했습니다. 탭을 닫고 다시 열어주세요.";
}

// 혜성 위치 (월드 내 px, 혜성 중심 기준). 시작 셀: 루미라 남쪽 5칸 (50,55).
let posX = (CENTER + 0.5) * CELL;
let posY = (55 + 0.5) * CELL;
// 물리 상태: 속도(px/초). 위치는 속도 적분으로만 움직인다.
let vx = 0, vy = 0, hintHidden = false;
// 가상 조이스틱: 누른 지점이 기준점, 끄는 방향으로 이동, 속도는 끈 거리 비례.
let steering = false, steerId = null, anchorX = 0, anchorY = 0, curX = 0, curY = 0, lastT = 0;
const satellites = []; // { el, radius(px), angle, speed(라디안/초) } — 루미라의 계 안에서 돈다

// 궤적 꼬리: 지나온 길(월드 좌표)을 최신순으로 보관, 0.9초 뒤 사라진다
const TRAIL_MAX = 24;
const trailReady = !!trailSvg;
if (!trailReady && statusEl) statusEl.textContent = "궤적 표시 요소를 찾지 못했습니다. 탭을 닫고 다시 열어주세요.";
const trailLines = [];
if (trailReady) {
  for (let i = 0; i < TRAIL_MAX; i++) {
    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln.setAttribute("stroke", "#bae6fd");
    ln.setAttribute("stroke-linecap", "round");
    ln.setAttribute("opacity", "0");
    trailSvg.appendChild(ln);
  }
}
const trailPts = []; // { x, y, t } 최신순
let trailTime = 0;
function updateTrail(dt) {
  if (!trailReady) return;
  trailTime += dt;
  const last = trailPts[0];
  if (!last || Math.hypot(posX - last.x, posY - last.y) > 8) {
    trailPts.unshift({ x: posX, y: posY, t: trailTime });
    if (trailPts.length > 60) trailPts.pop();
  }
  while (trailPts.length && trailTime - trailPts[trailPts.length - 1].t > 0.9) trailPts.pop();
  for (let i = 0; i < TRAIL_MAX; i++) {
    const ln = trailLines[i];
    if (i + 1 < trailPts.length) {
      const a = trailPts[i], b = trailPts[i + 1];
      ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y);
      ln.setAttribute("x2", b.x); ln.setAttribute("y2", b.y);
      const f = 1 - i / TRAIL_MAX;
      ln.setAttribute("stroke-width", (1 + 11 * f).toFixed(1));
      ln.setAttribute("opacity", (0.85 * f).toFixed(2));
    } else {
      ln.setAttribute("opacity", "0");
    }
  }
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
}
function loop(t) {
  requestAnimationFrame(loop); // 먼저 예약: 한 프레임이 죽어도 루프는 계속된다
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016);
  lastT = t;
  try {
    // 목표 속도: 조이스틱 방향 × 끈 거리 비례 속도 (최대 620px/초 ≈ 8.6셀/초)
    let tvx = 0, tvy = 0;
    if (steering) {
      const dx = curX - anchorX;
      const dy = curY - anchorY;
      const dist = Math.hypot(dx, dy);
      if (dist > 24) {
        const speed = Math.min(dist * 2.2, 620);
        tvx = (dx / dist) * speed; tvy = (dy / dist) * speed;
      }
      // 조이스틱 노브: 끈 방향으로, 최대 56px까지
      const cl = Math.min(dist, 56);
      joyKnob.style.transform = dist > 0 ? `translate(${(dx / dist) * cl}px, ${(dy / dist) * cl}px)` : "";
    }
    // 물리: 목표 속도를 향해 가속(조종 중엔 빠르게, 손 뗀 뒤엔 천천히 감속 = 관성)
    const k = steering ? 5.0 : 1.3;
    const a = 1 - Math.exp(-k * dt);
    vx += (tvx - vx) * a;
    vy += (tvy - vy) * a;
    if (!steering && Math.hypot(vx, vy) < 6) { vx = 0; vy = 0; }
    const sp = Math.hypot(vx, vy);
    if (sp > 640) { vx = vx / sp * 640; vy = vy / sp * 640; }
    posX += vx * dt;
    posY += vy * dt;
    // 월드 끝에 닿으면 그 방향 속도는 0 (벽에 부딪혀 멈춤)
    const m = CELL / 2, maxX = WORLD * CELL - m, maxY = WORLD * CELL - m;
    if (posX < m) { posX = m; if (vx < 0) vx = 0; }
    if (posX > maxX) { posX = maxX; if (vx > 0) vx = 0; }
    if (posY < m) { posY = m; if (vy < 0) vy = 0; }
    if (posY > maxY) { posY = maxY; if (vy > 0) vy = 0; }
    updateTrail(dt);
    // 테마 위성 공전: 루미라의 계 안에서, 루미라 중심으로 돈다 (계 = 하나의 셀)
    const cx = (CENTER + 0.5) * CELL, cy = (CENTER + 0.5) * CELL;
    for (const s of satellites) {
      s.angle += s.speed * dt;
      const px = cx + Math.cos(s.angle) * s.radius;
      const py = cy + Math.sin(s.angle) * s.radius;
      s.el.style.left = `${px - CELL / 2}px`;
      s.el.style.top = `${py - CELL / 2}px`;
    }
    render();
  } catch (err) {
    if (statusEl) statusEl.textContent = "화면 갱신 중 오류가 발생했습니다. 탭을 닫고 다시 열어주세요.";
  }
}

// 가상 조이스틱: 빈 공간을 누른 지점이 기준점, 끄는 방향으로 이동. 노드를 누른 건 클릭(팝업)용.
viewport.addEventListener("pointerdown", (e) => {
  if (steering) return;
  if (e.target.closest && e.target.closest(".node")) return;
  steering = true; steerId = e.pointerId;
  anchorX = curX = e.clientX; anchorY = curY = e.clientY;
  joyEl.style.left = `${anchorX - 56}px`;
  joyEl.style.top = `${anchorY - 56}px`;
  joyKnob.style.transform = "";
  joyEl.hidden = false;
  closePopup();
  if (!hintHidden) { hintEl.classList.add("gone"); hintHidden = true; }
  if (viewport.setPointerCapture) {
    try { viewport.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
  }
});
viewport.addEventListener("pointermove", (e) => {
  if (!steering || e.pointerId !== steerId) return;
  curX = e.clientX; curY = e.clientY;
});
function endSteer(e) {
  if (e.pointerId !== steerId) return;
  steering = false; steerId = null;
  joyEl.hidden = true;
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
  const cx = (CENTER + 0.5) * CELL, cy = (CENTER + 0.5) * CELL;

  // 루미라의 계 영역: 위성들이 도는 범위 전체를 하나의 계(하나의 셀)로 표시
  const maxOrbit = cats.length > 0 ? 90 + (cats.length - 1) * 34 : 0;
  const zoneDia = 2 * (maxOrbit + 80);
  const zone = document.createElement("div");
  zone.className = "system-zone";
  zone.style.cssText = `left:${cx - zoneDia / 2}px;top:${cy - zoneDia / 2}px;width:${zoneDia}px;height:${zoneDia}px;`;
  zone.innerHTML = `<span class="system-zone-label">루미라의 계</span>`;
  nodesEl.appendChild(zone);

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
    // 공전 궤도: 루미라의 계 안에서, 안쪽부터 바깥쪽으로 (위성은 따로 좌표 없음)
    const radius = 90 + i * 34;
    const angle = i * 2.399963;
    const period = 0.06 * Math.pow(radius, 1.5); // 초, 케플러식(주기 ∝ 반지름^1.5) — 바깥쪽일수록 확실히 느리게
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    const btn = document.createElement("button");
    btn.className = `node${tier === "splendid" ? " node-splendid" : ""}`;
    btn.type = "button";
    btn.style.cssText = `left:${px - CELL / 2}px;top:${py - CELL / 2}px;--glow:${color};`;
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
    satellites.push({ el: btn, radius, angle, speed: (Math.PI * 2) / period });
    nodesEl.appendChild(btn);
  });

  statusEl.textContent = "";
  render();
  requestAnimationFrame(loop);
}
main();
