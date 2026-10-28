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
// v15: 줌 로그-속도 제한(경계 횡단 시 휙 바뀜 방지, 서서히) + 꼬리 나이 기준 페이드(뚝 끊기지 않게).
// v16: 경계 히스테리시스 — 들어갈 때는 경계 안, 나올 때는 경계 + 2셀 밖을 넘어야 모드가 바뀐다.
// v17: 접근 블렌드 — 공백에서 가장 가까운 계에 15셀 안으로 들어서면 개요에서 경계(0.8) 쪽으로 서서히 커진다.
// 경계에 닿는 순간 안쪽 공식과 이어져 진입이 단절 없이 느껴진다. 공백 개요 범위 3000→3600px + 계 글리프(공백에서만 보이는 legible 마커).
// v18: 노드 위 드래그 — 노드 위에서 시작해도 12px 넘게 끌면 조이스틱으로 전환 (탭은 팝업 유지).
// v19: 진입 단절 제거 — 글리프 페이드를 줌에만 연동 (모드 전환 순간에 한 프레임 만에 사라지던 스냅 제거).
// 빠른 진입에서 줌이 0.5 아래로 뒤처진 채 경계를 넘으면, 기존 코드는 글리프를 즉시 꺼버렸다.
// 월드 글로우도 원시 경계가 아니라 히스테리시스 모드를 따라가게 해 경계에서의 깜빡임을 없앤다.
// v11의 화면 기준 속도만으로는 낮은 줌에서 월드 속도가 폭증해 움직임이 거칠어졌던 문제를 막는다.
// 조회수는 읽기 전용 GET /count만 쓴다(/hit 호출 금지).
// v20: 드래그 복종성 — 조이스틱 유지, 혜성 중심 유지. (1) 포인터 종료를 window까지 받아
// 캡처 실패 시에도 조종이 stuck되지 않게 한다. (2) 화면 속도 상한 900→500px/초,
// 손 뗀 뒤 감속 2.0→3.0으로 휙 날아가는 미끄러짐을 줄인다. (3) 혜성은 로컬 사용자 표시 —
// 나중에 온라인 서비스에서는 다른 사용자 혜성도 같은 방식으로 함께 표시한다 (지금은 1개만).
// v21: (1) HUD 화살표 뒤집기 — 기존 arrowFor는 계→혜성 방향으로 180도 반대였다.
// (2) 카메라 따라오기 — 카메라는 혜성에 고정하지 않고, 혜성이 화면 중심에서 120px 넘게
// 벗어날 때만 따라간다. 혜성이 화면 위를 직접 움직이고, 조이스틱·혜성 중심 이동은 유지한다.
// v22: 접근 데드존 축소 — 멀리서는 120px, 계에 가까워질수록 60px로 좁아지고 안에서는 60px.
// 카메라가 계 근처에서 혜성을 바짝 따라가서, 접근하는 계가 바깥쪽으로 부풀었다가 다시
// 들어오는 휙 지나감이 없어진다. 혜성은 안에서도 ±60px 직접 움직인다 (v21의 직접 이동 유지).
// v23: 지도 기준점 수정 — #world의 transform-origin을 0 0으로 (기본 한가운데면 줌≠1.0일 때
// 별·위성·영역이 3600×(1-줌)만큼 밀려나 화면 밖으로 사라진다). 카메라 숫자 조정과 무관한 구조 수정.
// v24: 글리프(아이콘) 제거 + 실제 계 의미 확대 — 멀리서도 실제 별·위성이 사라지지 않게
// 줌에만 연동하는 확대율 mag = max(1, 28/(64×줌))로 별·위성 궤도·영역을 키워서 보여주고,
// 줌이 커지면 1로 수렴해 실제 크기로 돌아온다. 아이콘 대체 없이 실제 계 자체가 이어진다.
// v25: 영역 확대를 크기 직접 변경에서 transform scale로 변경 — 매 프레임 다시 그리기(깜빡임 원인)를
// 없애고 GPU 확대만 쓴다. 영역 중심 기준이라 위치는 그대로, 확대율 계산식(mag)은 v24와 동일.
// v26: 확대 제거 — v24·v25의 의미 확대를 모두 제거하고 실제 크기로 보여준다.
// 멀리서는 작게 보여 거리감이 돌아오고, 매 프레임 바꾸는 일이 없어져 v23의 깜빡임 없는 그리기로 돌아간다.
// v23 기준점 수정 덕분에 실제 크기로도 멀리서 계가 보인다 (글리프 불필요).
// v27: 별 배경을 1100개 낱개 요소에서 한 장의 타일 그림으로 — 보이는 별밭은 같고,
// 판이 그리는 양이 확 줄어 멀리서 타일이 안 떨어진다. 타일은 원래 밀도와 같은 크기·밝기 분포.
// v28: 줌 따라오는 속도 2배 — 계 중심까지 가는 시간보다 줌이 느려 중심에 도착해도 덜 커져 있던 문제를 푼다.
// (v15의 0.9 ln/s 제한을 1.8 ln/s로; 어지러움 방지를 위해 제한 자체는 유지한다)
// v29: 혜성 꼬리 굵기를 줌으로 나눠 화면 굵기를 일정하게 — 월드 단위 굵기라 줌에 따라 굵어졌다 가늘어지던 문제를 푼다.
// (줌 1.0에서는 전과 완전히 같은 굵기; 꼬리 모양(앞 굵고 뒤 가늘게)은 그대로 유지한다)
// v30: 배경 별 움직임을 backgroundPosition(매번 화면 전체 다시 그리기)에서 transform으로 전환 —
// 합성만으로 움직여 폰이 버거워하지 않게 한다. 요소가 한 타일만큼 커서 가장자리가 드러나지 않고,
// 1024 단위로 접어 옮겨도 타일이 이음새 없이 이어져 보이는 모습은 전과 같다 (0.25배 느리게 따라가기 유지).
// v31: 무한 연결 — 끝에 닿으면 벽에 부딪혀 멈추지 않고 반대쪽으로 넘어간다 (도넛형 세계).
// 혜성과 카메라는 함께 넘어가 간격을 유지하고, 속도는 그대로 이어지며, 꼬리는 넘어갈 때 비워
// 세계를 가로지르는 선이 그어지지 않게 한다. 계까지의 거리·방향도 경계를 넘어 최단 거리로 계산한다.
// v32: 경계 넘어 연속 렌더링 — v31의 넘어가기가 화면 점프(순간이동)처럼 느껴지던 문제를 푼다.
// DOM을 복사하지 않는다(가벼움 유지). 대신 혜성·카메라 좌표를 접지 않고 그대로 이어가게 하고,
// 각 계·영역·불빛은 카메라에 가장 가까운 복사본 위치로 그린다. 건너편 계는 경계를 넘기 전부터
// 경계 너머에 이미 보이므로, 넘어가는 순간 화면이 점프하지 않고 그대로 이어진다.
// 별밭도 같은 원리: 2048 타일 격자에 맞춘 큰 판 하나만 카메라 근처에 두어, 판이 2048씩 옮겨가도
// 타일 패턴 위상이 그대로라 별이 튀지 않는다. 꼬리는 접지 않으므로 넘어갈 때도 끊기지 않고 이어진다.
// 좌표가 무한히 커지는 것을 막기 위해, 월드 크기(7200)와 별 타일(2048)의 최소공배수(460800) 단위로만
// 되돌린다 — 두 주기의 배수라 계 위치와 별 패턴이 모두 그대로 유지된다.
const BASE = "/dhamgkdltm.gitblog.io";
const API = "https://blog-counter.dhamgkdltm.workers.dev";
const CELL = 72, WORLD = 100, CENTER = 50;
// v31: 무한 연결 세계에서 두 점 사이의 최단 거리 차이 — 경계를 넘어 반대쪽이 더 가까우면 그쪽으로 접는다.
// (월드 px에는 size=WORLD*CELL, 셀에는 size=WORLD를 쓴다. 결과 범위는 [-size/2, size/2))
function wrapDelta(d, size) {
  let w = ((d % size) + size) % size;
  if (w >= size / 2) w -= size;
  return w;
}
// v32: 카메라에 가장 가까운 복사본 위치 — 경계 너머에 이미 보이는 건너편 계를 그리는 기준.
// 복사본이 바뀌는 순간(카메라가 계의 정반대편을 지날 때)은 그 계가 화면 밖에 있어 눈에 띄지 않는다.
const WORLD_PX = WORLD * CELL;
function wrappedPos(base, cam) {
  return cam + wrapDelta(base - cam, WORLD_PX);
}
// v32: 별밭 판 — 타일 2048의 배수 크기라 판을 2048씩 옮겨도 패턴 위상이 그대로다.
const STAR_TILE = 2048, STAR_SPAN = 5 * STAR_TILE; // 10240px, 개요 줌에서도 화면을 덮는다
// v32: 좌표 되돌림 단위 = lcm(7200, 2048) = 460800 — 계 복사본과 별 패턴이 모두 그대로 유지된다.
const REBASE = 460800;

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
const glyphBox = document.getElementById("sys-glyphs");
const cometEl = document.getElementById("comet"); // v21: 혜성 표시 (카메라와 분리되어 화면 위를 이동)
const glyphs = [];
// 필수 요소가 하나라도 없으면 조용히 멈추지 말고 화면에 알린다
if ((!viewport || !worldEl || !nodesEl || !starsEl || !readoutEl || !statusEl || !hintEl || !popupEl || !joyEl || !joyKnob || !cellMarker || !edgeGlowEl) && statusEl) {
  statusEl.textContent = "필수 요소를 찾지 못했습니다. 탭을 닫고 다시 열어주세요.";
}

// 혜성 위치 (월드 내 px, 혜성 중심 기준). 시작 셀: 루미라 남쪽 5칸 (50,55).
let posX = (CENTER + 0.5) * CELL;
let posY = (55 + 0.5) * CELL;
// v21: 카메라 위치 (월드 좌표). 혜성과 분리 — 혜성이 화면 위를 직접 움직이고 카메라는 따라간다.
let camX = posX, camY = posY;
// 물리 상태: 속도(px/초). 위치는 속도 적분으로만 움직인다.
let vx = 0, vy = 0, hintHidden = false;
let zoom = 1; // 현재 배율 (거리 줌이 매 프레임 목표 배율로 부드럽게 다가간다)
let insideSys = null; // v16: 현재 안에 있는 계 (히스테리시스 모드 — 경계 + 2셀 밖까지 유지된다)
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
// v32: 고정 계 요소(중심 노드, 이웃 항성, 영역 원, 불빛) — 기본 중심(cx,cy)과 마지막 이동량(dx,dy)을 보관.
// 이동량은 월드 크기의 배수(-7200/0/+7200)라서, 바뀌는 순간 해당 요소는 화면 밖에 있다.
const wrapEls = []; // { el, cx, cy, dx, dy }
function registerWrapEl(el, cx, cy) {
  const item = { el, cx, cy, dx: null, dy: null };
  wrapEls.push(item);
  return item;
}
function updateWrapEls() {
  for (const item of wrapEls) {
    const dx = wrappedPos(item.cx, camX) - item.cx;
    const dy = wrappedPos(item.cy, camY) - item.cy;
    if (dx !== item.dx || dy !== item.dy) {
      item.dx = dx; item.dy = dy;
      item.el.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }
}
// v32: 별밭 판 위치 — 카메라를 덮되 2048 격자에 맞춘다. 격자 경계를 넘을 때만 옮기고,
// 옮기는 양이 타일 배수라 별 패턴은 화면에서 튀지 않는다.
let starOriginX = null, starOriginY = null;
function updateStarsPos() {
  if (!starsEl) return;
  const ox = Math.floor((camX - STAR_SPAN / 2) / STAR_TILE) * STAR_TILE;
  const oy = Math.floor((camY - STAR_SPAN / 2) / STAR_TILE) * STAR_TILE;
  if (ox !== starOriginX || oy !== starOriginY) {
    starOriginX = ox; starOriginY = oy;
    starsEl.style.left = `${ox}px`;
    starsEl.style.top = `${oy}px`;
  }
}
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
const TRAIL_MAX = 60; // v15: 0.9초 분량(약 54프레임)을 모두 그려 나이 페이드가 끝까지 이어지게 한다
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
      // v29: 굵기를 줌으로 나눠 화면상 굵기를 일정하게 (월드 단위라 줌에 따라 크고 작아지던 문제 수정)
      ln.setAttribute("stroke-width", ((1 + 11 * f) / zoom).toFixed(2));
      // v15: 꼬리 투명도는 순서가 아니라 나이 기준 — 오래된 구간부터 서서히 사라져 뚝 끊기지 않는다
      const age = trailTime - b.t;
      ln.setAttribute("opacity", (0.85 * Math.max(0, 1 - age / 0.9)).toFixed(2));
    } else {
      ln.setAttribute("opacity", "0");
    }
  }
}

function currentCell() {
  return { col: Math.floor(posX / CELL), row: Math.floor(posY / CELL) };
}
// v24: 글리프(아이콘) 제거 — 멀리서도 실제 계 자체를 키워서 보여주므로 아이콘 대체가 필요 없다.
function render() {
  // 혜성(화면 중심)을 기준으로 월드 배율 적용: 화면 = 중심 + 배율 × (월드 − 혜성)
  worldEl.style.transform =
    `translate(${window.innerWidth / 2}px, ${window.innerHeight / 2}px) scale(${zoom}) translate(${-camX}px, ${-camY}px)`;
  // v21: 혜성 표시를 카메라 기준 화면 위치로 (화면 위를 직접 이동)
  if (cometEl) { cometEl.style.left = `${window.innerWidth / 2 + zoom * (posX - camX)}px`; cometEl.style.top = `${window.innerHeight / 2 + zoom * (posY - camY)}px`; }
  if (cellMarker) { const mw = Math.max(CELL * zoom, 16); cellMarker.style.width = `${mw}px`; cellMarker.style.height = `${mw}px`; }
  const { col, row } = currentCell();
  // 위치 표시: 공백에서는 상대좌표(가장 가까운 계 기준 방향·거리), 계 안에서는 안에 있다는 표시
  // (절대 셀 좌표는 시스템 내부 값으로만 쓰고 화면에는 보이지 않는다)
  const ranked = SYSTEMS.map((s) => {
    const d = Math.hypot(wrapDelta(posX - (s.col + 0.5) * CELL, WORLD * CELL), wrapDelta(posY - (s.row + 0.5) * CELL, WORLD * CELL));
    return { s, d };
  }).sort((a, b) => a.d - b.d);
  const nearest = ranked[0].s, nDist = ranked[0].d;
  const inside = !!insideSys; // v16: 상단 표시도 줌 모드를 따라간다 (경계 + 2셀 밖까지 '안에 있어' 유지)
  let rel;
  if (inside) {
    rel = `${insideSys.name} 안에 있어`;
  } else {
    const arrowFor = (s) => {
      // v31: 셀 차이도 경계를 넘어 최단 방향으로 (건너편 계는 건너편 방향으로 가리킨다)
      const dx = wrapDelta(col - s.col, WORLD), dy = wrapDelta(row - s.row, WORLD);
      const ang = Math.atan2(dy, -dx); // v21: 혜성→계 방향 (기존은 계→혜성으로 180도 반대였다)
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
    // 화면 최대 500px/초를 월드 속도로 환산한다 (줌이 작을수록 월드 이동은 빨라진다)
    let tvx = 0, tvy = 0;
    if (steering) {
      const dx = curX - anchorX;
      const dy = curY - anchorY;
      const dist = Math.hypot(dx, dy);
      if (dist > 24) {
        const screenSpeed = Math.min(dist * 2.2, 500);
        const speed = Math.min(screenSpeed / zoom, 1000); // 화면 상한 + 월드 상한 둘 다 적용
        tvx = (dx / dist) * speed; tvy = (dy / dist) * speed;
      }
      // 조이스틱 노브: 끈 방향으로, 최대 56px까지
      const cl = Math.min(dist, 56);
      joyKnob.style.transform = dist > 0 ? `translate(${(dx / dist) * cl}px, ${(dy / dist) * cl}px)` : "";
    }
    // 물리: 목표 속도를 향해 가속(조종 중엔 빠르게, 손 뗀 뒤엔 감속 — v11에서 감속을 빠르게 해 미끄러짐을 줄인다)
    const k = steering ? 5.0 : 3.0;
    const a = 1 - Math.exp(-k * dt);
    vx += (tvx - vx) * a;
    vy += (tvy - vy) * a;
    if (!steering && Math.hypot(vx, vy) < 6) { vx = 0; vy = 0; }
    const sp = Math.hypot(vx, vy);
    const maxWorld = Math.min(500 / zoom, 1000); // 화면 상한과 월드 상한 중 더 작은 쪽
    if (sp > maxWorld) { vx = vx / sp * maxWorld; vy = vy / sp * maxWorld; }
    posX += vx * dt;
    posY += vy * dt;
    // v32: 접지 않는다 — 혜성·카메라가 경계를 그대로 이어가므로 화면 점프가 없다.
    // 꼬리도 비우지 않는다. 접지 않은 좌표라 꼬리 선이 경계를 가로지르지 않고 그대로 이어진다.
    // 좌표가 너무 커지면 460800 단위로만 되돌린다 (계 복사본·별 패턴 모두 유지, 화면 위치는 그대로).
    if (Math.abs(posX) >= REBASE) {
      const shift = Math.trunc(posX / REBASE) * REBASE;
      posX -= shift; camX -= shift;
      for (const p of trailPts) p.x -= shift;
    }
    if (Math.abs(posY) >= REBASE) {
      const shift = Math.trunc(posY / REBASE) * REBASE;
      posY -= shift; camY -= shift;
      for (const p of trailPts) p.y -= shift;
    }
    // v22: 가장 가까운 계를 먼저 구한다 (카메라 블록에서 데드존을 정하는 데 쓴다)
    let nearSys = SYSTEMS[0], nearDist = Infinity;
    for (const s of SYSTEMS) {
      const d = Math.hypot(wrapDelta(posX - (s.col + 0.5) * CELL, WORLD * CELL), wrapDelta(posY - (s.row + 0.5) * CELL, WORLD * CELL));
      if (d < nearDist) { nearDist = d; nearSys = s; }
    }
    // v22: 접근 데드존 축소 — 멀리서는 120px, 계에 가까워질수록 60px로 좁아지고 안에서는 60px
    let DZ = 120;
    if (insideSys) {
      DZ = 60;
    } else {
      const nearR2 = nearSys.zoneDia / 2;
      const approachR = nearR2 + 15 * CELL;
      if (nearDist < approachR) {
        const tt = Math.min(1, Math.max(0, (approachR - nearDist) / (approachR - nearR2)));
        DZ = 120 - 60 * tt;
      }
    }
    {
      const ox = zoom * (posX - camX), oy = zoom * (posY - camY);
      const off = Math.hypot(ox, oy);
      if (off > DZ) {
        const tx = posX - (ox / off) * (DZ / zoom);
        const ty = posY - (oy / off) * (DZ / zoom);
        const ck = 1 - Math.exp(-8 * dt);
        camX += (tx - camX) * ck;
        camY += (ty - camY) * ck;
      }
      // v32: 카메라도 접지 않는다 — 접은 카메라가 v31 점프의 원인이었다.
      // 계 렌더링은 wrappedPos가 카메라 근처 복사본으로 처리한다.
    }
    // 움직임 기준점: 원경은 천천히, 방향 화살표는 속도 방향을 가리킨다
    // v30: 배경은 backgroundPosition(매번 다시 그리기) 대신 transform으로 옮긴다 (합성만으로 움직임).
    // 1024 타일이 이음새 없이 이어지므로 1024 단위로 접어 옮겨도 패턴이 끊기지 않는다.
    if (farEl) {
      const mx = ((camX * 0.25 % 1024) + 1024) % 1024;
      const my = ((camY * 0.25 % 1024) + 1024) % 1024;
      farEl.style.transform = `translate3d(${-mx}px, ${-my}px, 0)`;
    }
    if (headingEl) {
      const spd = Math.hypot(vx, vy);
      if (spd > 40) {
        const ang = Math.atan2(vy, vx);
        headingEl.style.opacity = Math.min(0.9, spd / 600).toFixed(2);
        headingEl.style.left = `${window.innerWidth / 2 + zoom * (posX - camX) + Math.cos(ang) * 30}px`;
        headingEl.style.top = `${window.innerHeight / 2 + zoom * (posY - camY) + Math.sin(ang) * 30}px`;
        headingEl.style.transform = `translate(-50%, -50%) rotate(${ang * 180 / Math.PI + 90}deg)`;
      } else {
        headingEl.style.opacity = "0";
      }
    }
    // v13 줌 — 두 가지 모드 (공백 / 계 내부)
    // 공백(어느 계의 경계 안에도 없을 때): 넓은 개요 줌 — 가장 가까운 계에 15셀 안으로 들어서면 경계(0.8) 쪽으로 서서히 커진다.
    //   개요 배율 = 화면 짧은 변 기준 약 3600px 분량이 들어오게 (폰 ≈0.10, 데스크톱 ≈0.23)
    // 계 내부(경계 안): 경계 0.8에서 중심 2.8로 깊이에 따라 확대 — 위성을 하나씩 만날 수 있게 된다.
    //   경계 횡단 전환은 v15 속도 제한이 서서히 메우고, v16 히스테리시스가 들락날락을 막는다.
    // v22: nearSys/nearDist는 카메라 블록 앞에서 이미 계산했다 (여기서는 재사용만 한다)
    // v16: 진입/이탈 히스테리시스 — 경계에서 들락날락해도 줌이 왔다갔다하지 않는다.
    // 들어갈 때는 경계 안, 나올 때는 경계 + 2셀 밖을 넘어야 모드가 바뀐다.
    if (insideSys) {
      const dIn = Math.hypot(wrapDelta(posX - (insideSys.col + 0.5) * CELL, WORLD * CELL), wrapDelta(posY - (insideSys.row + 0.5) * CELL, WORLD * CELL));
      if (dIn > insideSys.zoneDia / 2 + 2 * CELL) insideSys = null;
    }
    if (!insideSys && nearDist <= nearSys.zoneDia / 2) insideSys = nearSys;
    let targetZoom;
    if (insideSys) {
      const dIn = Math.hypot(wrapDelta(posX - (insideSys.col + 0.5) * CELL, WORLD * CELL), wrapDelta(posY - (insideSys.row + 0.5) * CELL, WORLD * CELL));
      targetZoom = Math.max(0.8, 0.8 + 2.0 * (1 - dIn / (insideSys.zoneDia / 2)));
    } else {
      // v17: 공백 개요 범위 3600px + 접근 블렌드 — 가장 가까운 계에 15셀 안으로 들어서면
      // 개요에서 경계(0.8) 쪽으로 서서히 커져, 경계에 닿는 순간 안쪽 공식과 단절 없이 이어진다.
      const overview = Math.min(0.5, Math.max(0.08, (0.9 * Math.min(window.innerWidth, window.innerHeight)) / 3600));
      const nearR2 = nearSys.zoneDia / 2;
      const approachR = nearR2 + 15 * CELL;
      if (nearDist < approachR) {
        const t = Math.min(1, Math.max(0, (approachR - nearDist) / (approachR - nearR2)));
        targetZoom = Math.exp(Math.log(overview) + t * (Math.log(0.8) - Math.log(overview)));
      } else {
        targetZoom = overview;
      }
    }
    // v28: 줌은 로그 공간에서 초당 1.8까지 변한다 (v15의 0.9에서 2배) — 계 중심까지 가는 동안 줌이
    // 따라오지 못해 중심에 도착해도 덜 커져 있던 문제를 푼다. 제한 자체는 유지해 한 번에 휙 바뀌지 않는다.
    const lz = Math.log(zoom), lt = Math.log(targetZoom);
    const dz = lt - lz;
    zoom = Math.exp(lz + Math.sign(dz) * Math.min(Math.abs(dz), 1.8 * dt));
    // 계 불빛: 월드 글로우는 가까울수록 진하게, 경계 안에서는 더 진하게 (부드럽게 수렴)
    // 화면 밖 계는 화면 가장자리에 은은한 빛으로 방향을 표시한다
    for (let i = 0; i < SYSTEMS.length; i++) {
      const s = SYSTEMS[i];
      const sx = (s.col + 0.5) * CELL, sy = (s.row + 0.5) * CELL;
      const d = Math.hypot(wrapDelta(posX - sx, WORLD * CELL), wrapDelta(posY - sy, WORLD * CELL));
      const targetOp = insideSys === s ? 0.85 : 0.45; // v19: 글로우도 히스테리시스 모드를 따른다
      glowOp[i] += (targetOp - glowOp[i]) * (1 - Math.exp(-3 * dt));
      if (glowEls[i]) glowEls[i].style.opacity = glowOp[i].toFixed(2);
      const el = edgeEls[i];
      if (el) {
        // v31: 화면 위치도 경계를 넘어 최단 방향으로 (건너편 계의 빛이 건너편 가장자리에 뜬다)
        const wx = window.innerWidth / 2 + zoom * wrapDelta(sx - camX, WORLD * CELL);
        const wy = window.innerHeight / 2 + zoom * wrapDelta(sy - camY, WORLD * CELL);
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
    // v26: 확대 제거 — 실제 크기로 보여준다. 멀리서는 작게 보여 거리감이 돌아오고,
    // 매 프레임 바꾸는 일이 없어져 v23 때처럼 깜빡임 없는 그리기로 돌아간다.
    // 위성 공전: 각 위성은 자기 계의 중심을 돈다 (계 = 하나의 셀, 위성은 좌표 없음)
    for (const s of satellites) {
      s.angle += s.speed * dt;
      // v32: 위성이 도는 중심도 카메라 근처 복사본으로 — 경계를 넘을 때 위성이 튀지 않는다
      const cwX = wrappedPos(s.cx, camX);
      const cwY = wrappedPos(s.cy, camY);
      const px = cwX + Math.cos(s.angle) * s.radius;
      const py = cwY + Math.sin(s.angle) * s.radius;
      s.el.style.left = `${px - CELL / 2}px`;
      s.el.style.top = `${py - CELL / 2}px`;
    }
    // v32: 고정 계 요소 + 별밭 판을 카메라 근처 복사본으로
    updateWrapEls();
    updateStarsPos();
    render();
  } catch (err) {
    if (statusEl) statusEl.textContent = "화면 갱신 중 오류: " + (err && err.message ? err.message : String(err));
  }
}

// 가상 조이스틱: 누른 지점이 기준점, 끄는 방향으로 이동.
// v18: 노드 위에서 시작해도 12px 넘게 끌면 조이스틱으로 전환한다 (그전엔 노드 위 드래그를 아예 무시해,
// 계 안에서 화면 대부분이 노드일 때 드래그가 안 먹히는 경우가 많았다). 탭(끌지 않음)은 그대로 클릭 → 팝업.
let pendingNode = false;
function beginSteer() {
  steering = true;
  joyEl.style.left = `${anchorX - 56}px`;
  joyEl.style.top = `${anchorY - 56}px`;
  joyKnob.style.transform = "";
  joyEl.hidden = false;
  closePopup();
  if (!hintHidden) { hintEl.classList.add("gone"); hintHidden = true; }
  if (viewport.setPointerCapture) {
    try { viewport.setPointerCapture(steerId); } catch { /* 무시 */ }
  }
}
viewport.addEventListener("pointerdown", (e) => {
  if (steering || pendingNode) return;
  anchorX = curX = e.clientX; anchorY = curY = e.clientY;
  steerId = e.pointerId;
  if (e.target.closest && e.target.closest(".node")) { pendingNode = true; return; }
  beginSteer();
});
viewport.addEventListener("pointermove", (e) => {
  if (pendingNode && e.pointerId === steerId) {
    if (Math.hypot(e.clientX - anchorX, e.clientY - anchorY) > 12) {
      pendingNode = false;
      curX = e.clientX; curY = e.clientY;
      beginSteer();
    }
    return;
  }
  if (!steering || e.pointerId !== steerId) return;
  curX = e.clientX; curY = e.clientY;
});
function endSteer(e) {
  if (e.pointerId !== steerId) return;
  pendingNode = false;
  steering = false; steerId = null;
  joyEl.hidden = true;
}
viewport.addEventListener("pointerup", endSteer);
viewport.addEventListener("pointercancel", endSteer);
// v20: 종료 이벤트를 window까지 받아 캡처 실패/타깃 이탈 시에도 조종이 stuck되지 않게 한다
window.addEventListener("pointerup", endSteer);
window.addEventListener("pointercancel", endSteer);
viewport.addEventListener("lostpointercapture", endSteer);

function closePopup() { popupEl.hidden = true; }
document.getElementById("popup-close").addEventListener("click", closePopup);
function openPopup(title, meta, bodyHtml) {
  document.getElementById("popup-title").textContent = title;
  document.getElementById("popup-meta").textContent = meta;
  document.getElementById("popup-body").innerHTML = bodyHtml;
  popupEl.hidden = false;
  if (!hintHidden) { hintEl.classList.add("gone"); hintHidden = true; }
}

// v27: 별 배경을 낱개 1100개 대신 한 장의 타일 그림으로 — 보이는 별밭은 같고 판이 그리는 양이 확 준다.
// 타일 2048px에 원래 밀도(약 89개)와 같은 크기·밝기 분포로 그리고, 가장자리 이음새가 없게 9방향으로 겹쳐 그린다.
(function drawStars() {
  const TILE = 2048;
  const rand = mulberry32(20261026);
  const tile = document.createElement("canvas");
  tile.width = TILE; tile.height = TILE;
  const ctx = tile.getContext("2d");
  if (!ctx) return;
  for (let i = 0; i < 89; i++) {
    const x = rand() * TILE, y = rand() * TILE;
    const r = rand() < 0.08 ? 3 : rand() < 0.3 ? 2 : 1;
    const a = 0.3 + rand() * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (typeof tile.toDataURL === "function") {
    // v32: 판을 10240px로 키워 카메라 근처에 두면, 경계 너머에도 별이 이어진다.
    // 판 위치는 loop의 updateStarsPos가 2048 격자에 맞춰 정한다.
    starsEl.style.cssText = `position:absolute;left:0;top:0;width:${STAR_SPAN}px;height:${STAR_SPAN}px;pointer-events:none;background-image:url(${tile.toDataURL()});background-size:${TILE}px ${TILE}px;`;
  }
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
    registerWrapEl(g, scx, scy);
  });
  const zone = document.createElement("div");
  zone.className = "system-zone";
  zone.style.cssText = `left:${cx - zoneDia / 2}px;top:${cy - zoneDia / 2}px;width:${zoneDia}px;height:${zoneDia}px;`;
  zone.innerHTML = `<span class="system-zone-label">루미라의 계</span>`;
  nodesEl.appendChild(zone);
  registerWrapEl(zone, cx, cy);

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
  registerWrapEl(centerBtn, cx, cy);

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
    registerWrapEl(z, scx, scy);
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
    registerWrapEl(star, scx, scy);
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
