// Shared legal footer notice, injected on every SOC Range page so the
// licensing block renders on every page view. Uses the site theme variables.
(function () {
  function build() {
    if (document.getElementById("legal-notice")) return;
    var f = document.createElement("footer");
    f.id = "legal-notice";
    f.setAttribute(
      "style",
      "max-width:1100px;margin:40px auto 24px;padding:16px 20px 0;border-top:1px solid var(--line);font-size:13px;line-height:1.7;color:var(--ink-dim);text-align:center"
    );
    f.innerHTML =
      'This work is licensed under a <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer" style="color:var(--cyan)">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.<br>&copy; 2026 Rizwan Virani. Some rights reserved.';
    document.body.appendChild(f);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
