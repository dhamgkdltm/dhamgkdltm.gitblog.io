// 블로그 번역 위젯 (구글 번역 요소)
// 글 목록/본문은 자바스크립트로 렌더링되므로, 렌더링이 끝난 뒤에 붙여야 본문까지 번역된다.
// 각 페이지의 렌더링 스크립트가 finally에서 window.loadGoogleTranslate()를 호출한다.
// 목록에 한국어(ko)를 넣어 번역 뒤에도 드롭다운에서 한국어로 돌아올 수 있게 했다.
window.googleTranslateElementInit = function () {
  var el = document.getElementById("google_translate_element");
  if (!el || !window.google || !google.translate) return;
  new google.translate.TranslateElement({
    pageLanguage: "ko",
    includedLanguages: "ko,en,ja,zh-CN,zh-TW,es,fr,de,vi,th,id",
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, "google_translate_element");
};
window.loadGoogleTranslate = function () {
  if (document.querySelector('script[data-gt="1"]')) return;
  var s = document.createElement("script");
  s.dataset.gt = "1";
  s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  document.body.appendChild(s);
};
// 원문으로: 구글 번역 쿠키를 지우고 새로고침하면 원문이 돌아온다.
window.backToOriginal = function () {
  var ex = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
  document.cookie = "googtrans=; " + ex;
  try { document.cookie = "googtrans=; " + ex + " domain=" + location.hostname + ";"; } catch (e) { /* 무시 */ }
  location.reload();
};
(function () {
  var b = document.getElementById("translate-original-btn");
  if (b) b.addEventListener("click", window.backToOriginal);
})();
