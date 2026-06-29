/* SOC Range :: theme.js
   Light/dark theme switch. Dark is the default. The choice is saved per
   browser and applied on every page. A floating button toggles it so you
   can compare the two looks and decide. To lock the platform to one theme,
   set document.documentElement's data-theme in the page head, or just keep
   whichever you prefer here. */
(function () {
  var KEY = "soc.theme";

  function apply(theme) {
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  apply(saved === "light" ? "light" : "dark");

  function current() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function build() {
    if (document.getElementById("themeFab") || !document.body) return;
    var b = document.createElement("button");
    b.id = "themeFab";
    b.className = "theme-fab";
    b.type = "button";
    b.setAttribute("aria-label", "Toggle light or dark theme");
    function label() { b.textContent = current() === "light" ? "\u25D1 Dark" : "\u25D0 Light"; }
    label();
    b.addEventListener("click", function () {
      var next = current() === "light" ? "dark" : "light";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      label();
    });
    document.body.appendChild(b);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
