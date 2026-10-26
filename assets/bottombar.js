// 하단 고정 메뉴: 검색 버튼을 누르면 입력창이 열린다.
// 관리자(본인)에게만 테스트 우주 버튼을 하단 바에 추가한다.
// 판별은 조회수 본인 제외와 같은 관리자 토큰(localStorage blog-admin-token)이다.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("bottom-search-btn");
    const searchForm = document.getElementById("bottom-search");
    const searchInput = document.getElementById("bottom-search-input");
    const searchClose = document.getElementById("bottom-search-close");
    if (searchBtn && searchForm && searchInput) {
      searchBtn.addEventListener("click", () => {
        const willOpen = searchForm.hidden;
        searchForm.hidden = !willOpen;
        if (willOpen) searchInput.focus();
      });
      if (searchClose) {
        searchClose.addEventListener("click", () => { searchForm.hidden = true; });
      }
    }
    try {
      if (localStorage.getItem("blog-admin-token")) {
        const barBody = document.querySelector(".bottom-bar-body");
        if (barBody && !document.getElementById("bottom-space-btn")) {
          const a = document.createElement("a");
          a.className = "bottom-btn";
          a.id = "bottom-space-btn";
          a.href = "/dhamgkdltm.gitblog.io/space.html";
          a.setAttribute("aria-label", "테스트 우주 열기");
          a.innerHTML = '<span class="bottom-icon">🌌</span><span class="bottom-label">우주</span>';
          barBody.appendChild(a);
        }
      }
    } catch { /* 프라이빗 모드 등 localStorage 접근 실패 시 버튼 없음 */ }
  });
})();
