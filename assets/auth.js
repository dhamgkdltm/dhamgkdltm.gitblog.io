// GitHub 로그인 (Device Flow, GitHub App) — 서버 없이 브라우저에서 직접 인증한다.
// 로그인 토큰은 관리자(admin.js)와 같은 localStorage 키를 공유한다.
const GITHUB_CLIENT_ID = "Iv23lidWoOHT3HKphVRv"; // GitHub App의 Client ID (공개 정보) — 앱 생성 후 입력
const TOKEN_KEY = "blog-admin-token";
const REFRESH_KEY = "blog-admin-refresh";
const EXPIRES_KEY = "blog-admin-expires";
const SITE_BASE = "/dhamgkdltm.gitblog.io";

function authToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function renderAuth() {
  const area = document.getElementById("auth-area");
  if (area) {
    if (authToken()) {
      area.innerHTML =
        `<a href="${SITE_BASE}/admin.html">글 관리</a>` +
        `<button type="button" class="auth-btn" id="auth-logout">로그아웃</button>`;
      document.getElementById("auth-logout").addEventListener("click", logout);
    } else {
      area.innerHTML =
        `<button type="button" class="auth-btn" id="auth-login">GitHub 로그인</button>`;
      document.getElementById("auth-login").addEventListener("click", startLogin);
    }
  }
  const editLink = document.getElementById("edit-this-post");
  if (editLink) editLink.style.display = authToken() ? "" : "none";
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  renderAuth();
}

// ── 모달 ────────────────────────────────────────────────
let pollTimer = null;
function showModal(html) {
  let modal = document.getElementById("auth-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "auth-modal";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="auth-modal-box">${html}</div>`;
  modal.style.display = "flex";
}
function closeModal() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "none";
}
function modalWithClose(html) {
  showModal(html + `<p><button type="button" class="auth-btn" id="auth-close">닫기</button></p>`);
  document.getElementById("auth-close").addEventListener("click", closeModal);
}

// ── Device Flow ─────────────────────────────────────────
async function ghForm(url, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(params),
  });
  return res.json();
}

async function startLogin() {
  if (!GITHUB_CLIENT_ID) {
    alert("로그인이 아직 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return;
  }
  showModal(`<p>GitHub 인증 코드를 발급하는 중…</p>`);
  let data;
  try {
    data = await ghForm("https://github.com/login/device/code", {
      client_id: GITHUB_CLIENT_ID,
    });
  } catch {
    modalWithClose(`<p>네트워크 오류가 발생했습니다.</p>`);
    return;
  }
  if (!data.user_code) {
    modalWithClose(`<p>코드 발급에 실패했습니다.</p>`);
    return;
  }
  const { device_code, user_code, verification_uri, expires_in } = data;
  let interval = (data.interval || 5) + 1;
  showModal(`
    <h3>GitHub 로그인</h3>
    <p>아래 코드를 GitHub 인증 페이지에 입력하세요.</p>
    <p class="device-code">${user_code}</p>
    <p><a class="auth-open" href="${verification_uri}" target="_blank" rel="noopener">GitHub 인증 페이지 열기</a></p>
    <p>인증이 완료되면 자동으로 로그인됩니다…</p>
    <p><button type="button" class="auth-btn" id="auth-cancel">취소</button></p>`);
  document.getElementById("auth-cancel").addEventListener("click", closeModal);

  const deadline = Date.now() + (expires_in || 900) * 1000;
  const poll = async () => {
    if (Date.now() > deadline) {
      modalWithClose(`<p>코드가 만료됐습니다. 다시 시도해 주세요.</p>`);
      return;
    }
    let tok = null;
    try {
      tok = await ghForm("https://github.com/login/oauth/access_token", {
        client_id: GITHUB_CLIENT_ID,
        device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      });
    } catch { /* 네트워크 오류는 다음 폴링에서 재시도 */ }
    if (tok && tok.access_token) {
      saveTokens(tok);
      closeModal();
      renderAuth();
      return;
    }
    if (tok && tok.error === "slow_down") interval += 5;
    else if (tok && tok.error && tok.error !== "authorization_pending") {
      modalWithClose(`<p>로그인이 취소됐거나 실패했습니다.</p>`);
      return;
    }
    pollTimer = setTimeout(poll, interval * 1000);
  };
  pollTimer = setTimeout(poll, interval * 1000);
}

function saveTokens(tok) {
  localStorage.setItem(TOKEN_KEY, tok.access_token);
  if (tok.refresh_token) localStorage.setItem(REFRESH_KEY, tok.refresh_token);
  if (tok.expires_in) {
    localStorage.setItem(EXPIRES_KEY, String(Date.now() + tok.expires_in * 1000));
  }
}

// 토큰 만료 시 갱신 (admin.js에서 호출)
async function refreshAuthToken() {
  const rt = localStorage.getItem(REFRESH_KEY);
  if (!rt || !GITHUB_CLIENT_ID) return false;
  try {
    const tok = await ghForm("https://github.com/login/oauth/access_token", {
      client_id: GITHUB_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: rt,
    });
    if (tok.access_token) { saveTokens(tok); return true; }
  } catch { /* 무시 */ }
  return false;
}
window.refreshAuthToken = refreshAuthToken;

document.addEventListener("DOMContentLoaded", renderAuth);
