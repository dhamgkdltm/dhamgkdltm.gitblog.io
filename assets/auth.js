// GitHub 로그인 (OAuth 리디렉션 방식) — GitHub App 사용.
// 코드→토큰 교환은 client secret이 필요해서 작은 중계 서버(Cloudflare Worker)가 대신한다.
const GITHUB_CLIENT_ID = "Iv23lidWoOHT3HKphVRv"; // GitHub App의 Client ID (공개 정보)
const AUTH_WORKER_URL = "https://blog-auth.dhamgkdltm.workers.dev";
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
        `<button type="button" class="auth-btn auth-icon-btn" id="auth-logout" aria-label="로그아웃" title="로그아웃"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>`;
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

function startLogin() {
  if (!AUTH_WORKER_URL) {
    alert("로그인이 아직 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.");
    return;
  }
  // 인증 후 원래 보던 페이지로 돌아오기 + 위조 방지용 state
  sessionStorage.setItem("auth-return", location.pathname + location.search);
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem("auth-state", state);
  const callback = `${location.origin}${SITE_BASE}/auth.html`;
  const url =
    `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(callback)}&state=${state}`;
  location.href = url;
}

function saveAuthTokens(tok) {
  localStorage.setItem(TOKEN_KEY, tok.access_token);
  if (tok.refresh_token) localStorage.setItem(REFRESH_KEY, tok.refresh_token);
  if (tok.expires_in) {
    localStorage.setItem(EXPIRES_KEY, String(Date.now() + tok.expires_in * 1000));
  }
}
window.saveAuthTokens = saveAuthTokens;

// 토큰 만료 시 갱신 (admin.js에서 호출)
async function refreshAuthToken() {
  const rt = localStorage.getItem(REFRESH_KEY);
  if (!rt || !AUTH_WORKER_URL) return false;
  try {
    const res = await fetch(AUTH_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
    });
    const tok = await res.json();
    if (tok.access_token) { saveAuthTokens(tok); return true; }
  } catch { /* 무시 */ }
  return false;
}
window.refreshAuthToken = refreshAuthToken;

document.addEventListener("DOMContentLoaded", renderAuth);
