// 블로그 번역 위젯 (구글 번역 요소)
// 글 목록/본문은 자바스크립트로 렌더링되므로, 렌더링이 끝난 뒤에 붙여야 본문까지 번역된다.
// 각 페이지의 렌더링 스크립트가 finally에서 window.loadGoogleTranslate()를 호출한다.
window.googleTranslateElementInit = function () {
  var el = document.getElementById("google_translate_element");
  if (!el || !window.google || !google.translate) return;
  new google.translate.TranslateElement({
    pageLanguage: "ko",
    includedLanguages: "en,ja,zh-CN,zh-TW,es,fr,de,vi,th,id",
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
