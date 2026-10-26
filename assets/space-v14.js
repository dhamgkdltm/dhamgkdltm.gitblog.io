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
// v9: 제논식 거리 줌 — 루미라의 계에 가까울수록 시야가 확대되어 셀 내부가 펼쳐진다.
// v10: 이웃 계 + 중심 불빛 — 테스트용 이웃 계 4개, 계 불빛(월드 글로우 + 화면 가장자리 빛),
// 줌은 가장 가까운 계 중심 기준 (멀면 전체 개요, 경계를 넘을수록 그 계가 확대된다).
// v11: 개요 줌 하한 0.12 (먼 우주에서 계가 작게, 여러 계가 한 화면에 들어온다),
// 조이스틱 속도를 화면 기준으로 바꿔 줌이 바뀌어도 체감 속도가 일정해진다.
// v12: 속도 이중 상한 — 화면 900px/초 + 월드 1000px/초(약 14셀/초).
// v13: 공백 공간 + 경계 기반 두 모드 줌 — 계는 하나의 좌표, 좌표 사이는 공백.
// 공백에서는 넓은 개요 줌으로 고정해 주변 계를 작게, 상태를 한눈에 파악한다.
// 계 경계를 넘는 순간부터 깊이에 따라 확대되어 위성을 하나씩 만날 수 있게 된다.
// v14: 움직임 기준점 — 원경 패럴랙스(0.25배로 천천히 흐르는 배경 별) + 촘촘한 월드 별 +
// 이동 방향 화살표(속도 방향을 가리키고 정지하면 사라진다). 빈 공백에서도 속도와 방향이 느껴지게 한다.
// v11의 화면 기준 속도만으로는 낮은 줌에서 월드 속도가 폭증해 움직임이 거칠어졌던 문제를 막는다.
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
const cellMarker = document.getElementById("cell-marker");
const edgeGlowEl = document.getElementById("edge-glow");
const farEl = document.getElementById("parallax-far");
const headingEl = document.getElementById("heading");
// 필수 요소가 하나라도 없으면 조용히 멈추지 말고 화면에 알린다
if ((!viewport || !worldEl || !nodesEl || !starsEl || !readoutEl || !statusEl || !hintEl || !popupEl || !joyEl || !joyKnob || !cellMarker || !edgeGlowEl) && statusEl) {
  statusEl.textContent = "필수 요소를 찾지 못했습니다. 탭을 닫고 다시 열어주세요.";
}

// 혜성 위치 (월드 내 px, 혜성 중심 기준). 시작 셀: 루미라 남쪽 5칸 (50,55).
let posX = (CENTER + 0.5) * CELL;
let posY = (55 + 0.5) * CELL;
// 물리 상태: 속도(px/초). 위치는 속도 적분으로만 움직인다.
let vx = 0, vy = 0, hintHidden = false;
let zoom = 1; // 현재 배율 (거리 줌이 매 프레임 목표 배율로 부드럽게 다가간다)
// 가상 조이스틱: 누른 지점이 기준점, 끄는 방향으로 이동, 속도는 끈 거리 비례.
let steering = false, steerId = null, anchorX = 0, anchorY = 0, curX = 0, curY = 0, lastT = 0;
const satellites = []; // { el, radius(px), angle, speed(라디안/초), cx, cy } — 자기 계 중심을 돈다
// 계 목록: 루미라의 계(실제) + 테스트용 이웃 계 4개 (가상 표시, 실제 유저 아님)
const SYSTEMS = [
  { key: "lumira", name: "루미라의 계", col: CENTER, row: CENTER, color: "#fbbf24", glow: "251, 191, 36", zoneDia: null, test: false },
  { key: "nA", name: "이웃 계 A", col: 22, row: 22, color: "#5eead4", glow: "94, 234, 212", zoneDia: 480, test: true },
  { key: "nB", name: "이웃 계 B", col: 78, row: 24, color: "#c4b5fd", glow: "196, 181, 253", zoneDia: 480, test: true },
  { key: "nC", name: "이웃 계 C", col: 24, row: 78, color: "#fda4af", glow: "253, 164, 175", zoneDia: 480, test: true },
  { key: "nD", name: "이웃 계 D", col: 80, row: 80, color: "#7dd3fc", glow: "125, 211, 252", zoneDia: 480, test: true },
];
const glowEls = []; const glowOp = []; const edgeEls = [];
// 화면 밖 계의 방향을 화면 가장자리 빛으로 표시 (스크린 공간, 포스트 로드 전에도 만든다)
if (edgeGlowEl) {
  SYSTEMS.forEach((s) => {
    const d = document.createElement("div");
    d.className = "edge-light";
    d.style.background = `radial-gradient(circle, ${s.color} 0%, transparent 70%)`;
    d.style.opacity = "0";
    edgeGlowEl.appendChild(d);
    edgeEls.push(d);
  });
}

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
    trailLines.push(ln);
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
  // 혜성(화면 중심)을 기준으로 월드 배율 적용: 화면 = 중심 + 배율 × (월드 − 혜성)
  worldEl.style.transform =
    `translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px) scale(${zoom}) translate(${-posX}px, ${-posY}px)`;
  if (cellMarker) { const mw = Math.max(CELL * zoom, 16); cellMarker.style.width = `${mw}px`; cellMarker.style.height = `${mw}px`; }
  const { col, row } = currentCell();
  // 위치 표시: 공백에서는 상대좌표(가장 가까운 계 기준 방향·거리), 계 안에서는 안에 있다는 표시
  // (절대 셀 좌표는 시스템 내부 값으로만 쓰고 화면에는 보이지 않는다)
  const ranked = SYSTEMS.map((s) => {
    const d = Math.hypot(posX - (s.col + 0.5) * CELL, posY - (s.row + 0.5) * CELL);
    return { s, d };
  }).sort((a, b) => a.d - b.d);
  const nearest = ranked[0].s, nDist = ranked[0].d;
  const inside = nDist <= nearest.zoneDia / 2;
  let rel;
  if (inside) {
    rel = `${nearest.name} 안에 있어`;
  } else {
    const arrowFor = (s) => {
      const dx = col - s.col, dy = row - s.row;
      const ang = Math.atan2(-dy, dx);
      const dirs = ["→", "↗", "↑", "↖", "←", "↙", "↓", "↘"];
      const idx = Math.round(ang / (Math.PI / 4));
      return { arrow: dirs[((idx % 8) + 8) % 8], dist: Math.max(Math.abs(dx), Math.abs(dy)) };
    };
    const a1 = arrowFor(nearest);
    let text = `공백 공간 · ${nearest.name} ${a1.arrow} ${a1.dist}칸`;
    if (ranked[1]) {
      const a2 = arrowFor(ranked[1].s);
      text += ` · ${ranked[1].s.name} ${a2.arrow} ${a2.dist}칸`;
    }
    rel = text;
  }
  readoutEl.textContent = `${rel} · 줌 ×${zoom.toFixed(1)}`;
}
function loop(t) {
  requestAnimationFrame(loop); // 먼저 예약: 한 프레임이 죽어도 루프는 계속된다
  const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016);
  lastT = t;
  try {
    // 목표 속도: 화면상 속도를 끈 거리에 비례하게 (줌이 바뀌어도 체감 속도가 일정하다)
    // 화면 최대 900px/초를 월드 속도로 환산한다 (줌이 작을수록 월드 이동은 빨라진다)
    let tvx = 0, tvy = 0;
    if (steering) {
      const dx = curX - anchorX;
      const dy = curY - anchorY;
      const dist = Math.hypot(dx, dy);
      if (dist > 24) {
        const screenSpeed = Math.min(dist * 2.2, 900);
        const speed = Math.min(screenSpeed / zoom, 1000); // 화면 상한 + 월드 상한 둘 다 적용
        tvx = (dx / dist) * speed; tvy = (dy / dist) * speed;
      }
      // 조이스틱 노브: 끈 방향으로, 최대 56px까지
      const cl = Math.min(dist, 56);
      joyKnob.style.transform = dist > 0 ? `translate(${(dx / dist) * cl}px, ${(dy / dist) * cl}px)` : "";
    }
    // 물리: 목표 속도를 향해 가속(조종 중엔 빠르게, 손 뗀 뒤엔 감속 — v11에서 감속을 빠르게 해 미끄러짐을 줄인다)
    const k = steering ? 5.0 : 2.0;
    const a = 1 - Math.exp(-k * dt);
    vx += (tvx - vx) * a;
    vy += (tvy - vy) * a;
    if (!steering && Math.hypot(vx, vy) < 6) { vx = 0; vy = 0; }
    const sp = Math.hypot(vx, vy);
    const maxWorld = Math.min(900 / zoom, 1000); // 화면 상한과 월드 상한 중 더 작은 쪽
    if (sp > maxWorld) { vx = vx / sp * maxWorld; vy = vy / sp * maxWorld; }
    posX += vx * dt;
    posY += vy * dt;
    // 월드 끝에 닿으면 그 방향 속도는 0 (벽에 부딪혀 멈춤)
    const m = CELL / 2, maxX = WORLD * CELL - m, maxY = WORLD * CELL - m;
    if (posX < m) { posX = m; if (vx < 0) vx = 0; }
    if (posX > maxX) { posX = maxX; if (vx > 0) vx = 0; }
    if (posY < m) { posY = m; if (vy < 0) vy = 0; }
    if (posY > maxY) { posY = maxY; if (vy > 0) vy = 0; }
    // 움직임 기준점: 원경은 천천히, 방향 화살표는 속도 방향을 가리킨다
    if (farEl) farEl.style.backgroundPosition = `${-posX * 0.25}px ${-posY * 0.25}px`;
    if (headingEl) {
      const spd = Math.hypot(vx, vy);
      if (spd > 40) {
        const ang = Math.atan2(vy, vx);
        headingEl.style.opacity = Math.min(0.9, spd / 600).toFixed(2);
        headingEl.style.left = `${window.innerWidth / 2 + Math.cos(ang) * 30}px`;
        headingEl.style.top = `${window.innerHeight / 2 + Math.sin(ang) * 30}px`;
        headingEl.style.transform = `translate(-50%, -50%) rotate(${ang * 180 / Math.PI + 90}deg)`;
      } else {
        headingEl.style.opacity = "0";
      }
    }
    // v13 줌 — 두 가지 모드 (공백 / 계 내부)
    // 공백(어느 계의 경계 안에도 없을 때): 넓은 개요 줌으로 고정 — 주변 계가 작게 보이고 상태가 한눈에 들어온다.
    //   개요 배율 = 화면 짧은 변 기준 약 3000px 분량이 들어오게 (폰 ≈0.12, 데스크톱 ≈0.27)
    // 계 내부(경계 안): 경계 0.8에서 중심 2.8로 깊이에 따라 확대 — 위성을 하나씩 만날 수 있게 된다.
    //   경계를 넘는 순간의 전환은 기존 easing이 약 1초에 걸쳐 부드럽게 메워준다.
    let nearSys = SYSTEMS[0], nearDist = Infinity;
    for (const s of SYSTEMS) {
      const d = Math.hypot(posX - (s.col + 0.5) * CELL, posY - (s.row + 0.5) * CELL);
      if (d < nearDist) { nearDist = d; nearSys = s; }
    }
    const nearR = nearSys.zoneDia / 2;
    let targetZoom;
    if (nearDist <= nearR) {
      targetZoom = 0.8 + 2.0 * (1 - nearDist / nearR);
    } else {
      targetZoom = Math.min(0.5, Math.max(0.12, (0.9 * Math.min(window.innerWidth, window.innerHeight)) / 3000));
    }
    zoom += (targetZoom - zoom) * (1 - Math.exp(-3 * dt));
    // 계 불빛: 월드 글로우는 가까울수록 진하게, 경계 안에서는 더 진하게 (부드럽게 수렴)
    // 화면 밖 계는 화면 가장자리에 은은한 빛으로 방향을 표시한다
    for (let i = 0; i < SYSTEMS.length; i++) {
      const s = SYSTEMS[i];
      const sx = (s.col + 0.5) * CELL, sy = (s.row + 0.5) * CELL;
      const d = Math.hypot(posX - sx, posY - sy);
      const targetOp = d <= s.zoneDia / 2 ? 0.85 : 0.45;
      glowOp[i] += (targetOp - glowOp[i]) * (1 - Math.exp(-3 * dt));
      if (glowEls[i]) glowEls[i].style.opacity = glowOp[i].toFixed(2);
      const el = edgeEls[i];
      if (el) {
        const wx = window.innerWidth / 2 + zoom * (sx - posX);
        const wy = window.innerHeight / 2 + zoom * (sy - posY);
        const m = 90, vw = window.innerWidth, vh = window.innerHeight;
        if (wx < -m || wx > vw + m || wy < -m || wy > vh + m) {
          const ex = Math.min(Math.max(wx, 40), vw - 40);
          const ey = Math.min(Math.max(wy, 40), vh - 40);
          const op = Math.min(0.32, Math.max(0.12, 0.34 - (d / CELL) * 0.004));
          el.style.opacity = op.toFixed(2);
          el.style.left = `${ex - 150}px`;
          el.style.top = `${ey - 150}px`;
        } else {
          el.style.opacity = "0";
        }
      }
    }
    updateTrail(dt);
    // 위성 공전: 각 위성은 자기 계의 중심을 돈다 (계 = 하나의 셀, 위성은 좌표 없음)
    for (const s of satellites) {
      s.angle += s.speed * dt;
      const px = s.cx + Math.cos(s.angle) * s.radius;
      const py = s.cy + Math.sin(s.angle) * s.radius;
      s.el.style.left = `${px - CELL / 2}px`;
      s.el.style.top = `${py - CELL / 2}px`;
    }
    render();
  } catch (err) {
    if (statusEl) statusEl.textContent = "화면 갱신 중 오류: " + (err && err.message ? err.message : String(err));
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
  for (let i = 0; i < 1100; i++) {
    const s = document.createElement("span");
    s.className = "star";
    const size = rand() < 0.08 ? 3 : rand() < 0.3 ? 2 : 1;
    s.style.cssText = `left:${Math.floor(rand() * WORLD * CELL)}px;top:${Math.floor(rand() * WORLD * CELL)}px;width:${size}px;height:${size}px;opacity:${(0.3 + rand() * 0.7).toFixed(2)};`;
    frag.appendChild(s);
  }
  starsEl.appendChild(frag);
})();

// 원경 패럴랙스: 화면 공간의 별 타일 — 혜성 이동의 0.25배만 따라가 깊이감을 준다
// (타일은 상하좌우로 이어지게 그려 이음새가 보이지 않는다)
if (farEl) {
  const tile = document.createElement("canvas");
  tile.width = 1024; tile.height = 1024;
  const ctx = tile.getContext("2d");
  const trand = mulberry32(20261027);
  for (let i = 0; i < 90; i++) {
    const x = trand() * 1024, y = trand() * 1024;
    const r = trand() < 0.15 ? 3 : trand() < 0.4 ? 2 : 1;
    const a = 0.15 + trand() * 0.35;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226, 232, 255, ${a.toFixed(2)})`;
      ctx.fill();
    }
  }
  farEl.style.backgroundImage = `url(${tile.toDataURL()})`;
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
  const cx = (CENTER + 0.5) * CELL, cy = (CENTER + 0.5) * CELL;

  // 루미라의 계 영역: 위성들이 도는 범위 전체를 하나의 계(하나의 셀)로 표시
  const maxOrbit = cats.length > 0 ? 90 + (cats.length - 1) * 34 : 0;
  const zoneDia = 2 * (maxOrbit + 80);
  SYSTEMS[0].zoneDia = zoneDia;
  // 계 불빛 (월드 공간): 중심 항성의 빛이 배경에 은은하게 퍼진다. 글로우가 가장 아래에 깔린다.
  SYSTEMS.forEach((s, i) => {
    const scx = (s.col + 0.5) * CELL, scy = (s.row + 0.5) * CELL;
    const gd = s.zoneDia * 3;
    const g = document.createElement("div");
    g.className = "system-glow";
    g.style.cssText = `left:${scx - gd / 2}px;top:${scy - gd / 2}px;width:${gd}px;height:${gd}px;background:radial-gradient(circle, rgba(${s.glow}, .5) 0%, rgba(${s.glow}, .22) 45%, transparent 70%);opacity:.45;`;
    nodesEl.appendChild(g);
    glowEls[i] = g; glowOp[i] = 0.45;
  });
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
    satellites.push({ el: btn, radius, angle, speed: (Math.PI * 2) / period, cx, cy });
    nodesEl.appendChild(btn);
  });

  // 테스트용 이웃 계 4개: 중심 항성 + 공전하는 테스트 위성 + 경계 원
  SYSTEMS.slice(1).forEach((s, si) => {
    const scx = (s.col + 0.5) * CELL, scy = (s.row + 0.5) * CELL;
    const z = document.createElement("div");
    z.className = "system-zone system-zone-neighbor";
    z.style.cssText = `left:${scx - s.zoneDia / 2}px;top:${scy - s.zoneDia / 2}px;width:${s.zoneDia}px;height:${s.zoneDia}px;border-color:${s.color}55;background:radial-gradient(circle, ${s.color}14, transparent 70%);`;
    z.innerHTML = `<span class="system-zone-label">${escapeHtml(s.name)} · 테스트</span>`;
    nodesEl.appendChild(z);
    const star = document.createElement("button");
    star.className = "node node-neighbor";
    star.type = "button";
    star.style.cssText = `left:${s.col * CELL}px;top:${s.row * CELL}px;--glow:${s.color};`;
    star.setAttribute("aria-label", `${s.name}, 테스트용 이웃 계`);
    star.innerHTML = `<span class="orb" style="width:44px;height:44px;background:radial-gradient(circle at 38% 35%, #ffffff, ${s.color} 55%, ${s.color});"></span><span class="node-label">${escapeHtml(s.name)}</span><span class="node-sub">테스트용 표시</span>`;
    star.addEventListener("click", () => openPopup(
      `${s.name} (테스트)`,
      "실제 계가 아니야 · 방향 감각 테스트용",
      `<div class="popup-profile">이건 테스트용으로 표시한 가상의 이웃 계야.<br>나중에 실제 플레이어가 만든 계가 여기에 표시될 거야.<br><br>지금은 이 계를 향해 이동하면서<br>멀리선 작게, 경계를 넘으면 크게 보이는지,<br>중심 항성의 불빛으로 방향이 느껴지는지 확인하는 용도야.</div>`
    ));
    nodesEl.appendChild(star);
    for (let k = 0; k < 3; k++) {
      const radius = 90 + k * 34;
      const angle = si * 1.7 + k * 2.1;
      const period = 0.06 * Math.pow(radius, 1.5);
      const dbtn = document.createElement("button");
      dbtn.className = "node node-neighbor-sat";
      dbtn.type = "button";
      dbtn.style.cssText = `left:${scx + Math.cos(angle) * radius - CELL / 2}px;top:${scy + Math.sin(angle) * radius - CELL / 2}px;--glow:${s.color};`;
      dbtn.setAttribute("aria-label", `${s.name} 테스트 위성`);
      dbtn.innerHTML = `<span class="orb" style="width:26px;height:26px;background:radial-gradient(circle at 38% 35%, #ffffff, ${s.color} 60%, ${s.color});opacity:.85;"></span>`;
      dbtn.addEventListener("click", () => star.click());
      satellites.push({ el: dbtn, radius, angle, speed: (Math.PI * 2) / period, cx: scx, cy: scy });
      nodesEl.appendChild(dbtn);
    }
  });

  statusEl.textContent = "";
  render();
  requestAnimationFrame(loop);
}
main();
