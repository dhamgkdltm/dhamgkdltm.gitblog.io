// 하단 고정 메뉴: 검색 버튼을 누르면 입력창이 열린다.
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("bottom-search-btn");
    const searchForm = document.getElementById("bottom-search");
    const searchInput = document.getElementById("bottom-search-input");
    const searchClose = document.getElementById("bottom-search-close");
    if (!searchBtn || !searchForm || !searchInput) return;
    searchBtn.addEventListener("click", () => {
      const willOpen = searchForm.hidden;
      searchForm.hidden = !willOpen;
      if (willOpen) searchInput.focus();
    });
    if (searchClose) {
      searchClose.addEventListener("click", () => { searchForm.hidden = true; });
    }
  });
})();
