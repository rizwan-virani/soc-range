// Shared legal footer notice, injected on every SOC Range page so the
// licensing block renders on every page view. Uses the site theme variables.
(function () {
  function build() {
    if (document.getElementById("legal-notice")) return;
    var f = document.createElement("footer");
    f.id = "legal-notice";
    f.setAttribute(
      "style",
      "max-width:1180px;margin:44px auto 30px;padding:18px 22px 0;border-top:1px solid var(--line);font-size:13px;line-height:1.7;color:var(--ink-faint);text-align:left"
    );
    f.innerHTML =
      '<p style="margin:0 0 14px"><b style="color:var(--ink)">SOC Range</b> · A simulated Security Operations Center for CYBR 4350: Senior Project. Designed and authored by Professor Rizwan Virani, San Jacinto College.</p>' +
      '<p style="margin:0 0 14px">This is a personal educational resource. All views, content, and materials presented here are entirely my own and do not represent the official positions, endorsements, or policies of San Jacinto College.</p>' +
      '<p style="margin:0 0 14px">SOC Range is a training simulation. It is not affiliated with, endorsed by, or sponsored by any of the companies whose products or technologies it references. Product and technology names used here, including Splunk, Cisco, Microsoft, Windows, Microsoft Defender, Sysmon, PowerShell, Amazon Web Services, MITRE ATT&amp;CK, and CompTIA CySA+, are trademarks of their respective owners and are used only to identify the tools and skills this resource teaches. NIST publications are U.S. government works in the public domain, and Sigma is an open detection-rule format. All scenarios, logs, and indicators are fictional and original. Released for academic use.</p>' +
      '<p style="margin:0 0 14px">This site was designed and engineered with development assistance from Anthropic\'s Claude Opus 4.8 large language model.</p>' +
      '<div style="border-top:1px solid var(--line);padding-top:14px">This work is licensed under a <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer" style="color:var(--cyan)">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a>.<br>&copy; 2026 Rizwan Virani. Some rights reserved.</div>';
    document.body.appendChild(f);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
