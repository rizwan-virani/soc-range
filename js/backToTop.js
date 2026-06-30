/* Back-to-top FAB. Floating button that follows the viewport like the theme
   toggle and smooth-scrolls to the top. Self-contained, no dependencies.
   It appears after you scroll down and stays hidden at the top of the page. */
(function () {
  function init() {
    if (document.getElementById("toTopFab") || !document.body) return;
    var b = document.createElement("button");
    b.id = "toTopFab";
    b.className = "totop-fab";
    b.type = "button";
    b.setAttribute("aria-label", "Back to top");
    b.innerHTML = "\u2191 Top";
    document.body.appendChild(b);
    var THRESHOLD = 280;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      b.classList.toggle("show", y > THRESHOLD);
    }
    b.addEventListener("click", function () {
      try { window.scrollTo({ top: 0, behavior: "smooth" }); }
      catch (e) { window.scrollTo(0, 0); }
    });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
