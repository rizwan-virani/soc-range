/* SOC Range :: orient.js
 * Reusable guided-orientation engine. Vanilla, no dependencies. Drives the
 * spotlight tour on the launcher and the per-activity orientations on the
 * workstation and the labs. Reuses the .tour-block / .tour-spot / .tour-pop
 * styles in soc.css, so no page needs its own CSS.
 *
 * Usage:
 *   SOC.orient.attach({
 *     id: "wk",                 // unique key for the auto-once flag
 *     buttonId: "orientBtn",    // optional button that replays it
 *     autoOnce: true,           // auto-show the first time per id
 *     steps: fnOrArray          // array of steps, or a function returning one
 *   });
 *
 * Step: { sel, title, body }
 *   sel  : CSS selector string, an element, a function returning an element,
 *          or null for a centered card with no spotlight.
 *   title: short heading. body: one short paragraph (plain text).
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});

  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  var els = null;     // { block, spot, pop }
  var steps = [];
  var idx = 0;
  var onEnd = null;

  function resolve(sel) {
    if (!sel) return null;
    if (typeof sel === "function") { try { return sel(); } catch (e) { return null; } }
    if (typeof sel === "string") return document.querySelector(sel);
    return sel; // assume element
  }

  function build() {
    var block = document.createElement("div"); block.className = "tour-block";
    var spot = document.createElement("div"); spot.className = "tour-spot";
    var pop = document.createElement("div"); pop.className = "tour-pop";
    document.body.appendChild(block);
    document.body.appendChild(spot);
    document.body.appendChild(pop);
    document.addEventListener("keydown", onKey, true);
    return { block: block, spot: spot, pop: pop };
  }

  function onKey(e) {
    if (!els) return;
    if (e.key === "Escape") { e.preventDefault(); end(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
  }

  function dots() {
    var h = "";
    for (var i = 0; i < steps.length; i++) h += '<i class="' + (i === idx ? "on" : "") + '"></i>';
    return h;
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }

  function render(target) {
    var s = steps[idx];
    var last = idx === steps.length - 1;
    els.pop.innerHTML =
      '<div class="step">Step ' + (idx + 1) + " of " + steps.length + "</div>" +
      "<h3>" + esc(s.title) + "</h3>" +
      "<p>" + esc(s.body) + "</p>" +
      '<div class="tour-nav">' +
        '<div class="tour-dots">' + dots() + "</div>" +
        (idx > 0 ? '<button class="btn ghost" data-act="back" type="button">Back</button>' : '<button class="skip" data-act="skip" type="button">Skip</button>') +
        '<button class="btn primary" data-act="next" type="button">' + (last ? "Done" : "Next") + "</button>" +
      "</div>";
    els.pop.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "next") go(idx + 1);
        else if (a === "back") go(idx - 1);
        else end();
      });
    });
    position(target);
  }

  function position(target) {
    var spot = els.spot, pop = els.pop;
    var vw = window.innerWidth, vh = window.innerHeight;
    if (!target) {
      spot.style.opacity = "0";
      spot.style.width = spot.style.height = "0px";
      spot.style.top = (vh / 2) + "px"; spot.style.left = (vw / 2) + "px";
      var pw0 = pop.offsetWidth || 360, ph0 = pop.offsetHeight || 200;
      pop.style.left = Math.max(12, (vw - pw0) / 2) + "px";
      pop.style.top = Math.max(12, (vh - ph0) / 2) + "px";
      return;
    }
    spot.style.opacity = "1";
    var r = target.getBoundingClientRect();
    var pad = 8;
    var top = Math.max(6, r.top - pad), left = Math.max(6, r.left - pad);
    var w = Math.min(vw - left - 6, r.width + pad * 2);
    var h = r.height + pad * 2;
    spot.style.top = top + "px"; spot.style.left = left + "px";
    spot.style.width = w + "px"; spot.style.height = h + "px";

    var pw = pop.offsetWidth || 360, ph = pop.offsetHeight || 200;
    var pLeft = Math.min(Math.max(12, left), vw - pw - 12);
    var below = r.bottom + 14, above = r.top - ph - 14;
    var pTop = (below + ph < vh - 8) ? below : (above > 8 ? above : Math.max(12, (vh - ph) / 2));
    pop.style.left = pLeft + "px";
    pop.style.top = pTop + "px";
  }

  function go(n) {
    if (n < 0) return;
    if (n >= steps.length) { end(); return; }
    idx = n;
    var target = resolve(steps[idx].sel);
    if (target && target.scrollIntoView) {
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
    setTimeout(function () { if (els) render(target); }, reduce ? 0 : 240);
  }

  function reposition() { if (els) position(resolve(steps[idx].sel)); }

  function start(config) {
    if (els) return;
    var arr = (typeof config.steps === "function") ? config.steps() : config.steps;
    if (!arr || !arr.length) return;
    steps = arr.filter(function (s) { return s && (!s.sel || resolve(s.sel)); }); // drop steps whose target is missing
    if (!steps.length) return;
    onEnd = config.onEnd || null;
    idx = 0;
    els = build();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    go(0);
  }

  function end() {
    if (!els) return;
    window.removeEventListener("resize", reposition);
    window.removeEventListener("scroll", reposition, true);
    document.removeEventListener("keydown", onKey, true);
    [els.block, els.spot, els.pop].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
    els = null;
    if (onEnd) { try { onEnd(); } catch (e) {} }
  }

  function seenKey(id) { return "soc.orient." + id; }
  function isSeen(id) { try { return localStorage.getItem(seenKey(id)) === "1"; } catch (e) { return false; } }
  function markSeen(id) { try { localStorage.setItem(seenKey(id), "1"); } catch (e) {} }

  function attach(config) {
    config = config || {};
    var runner = function () { markSeen(config.id); start(config); };
    var btn = config.buttonId ? document.getElementById(config.buttonId) : null;
    if (btn) btn.addEventListener("click", runner);
    if (config.autoOnce && config.id && !isSeen(config.id) && !reduce) {
      setTimeout(runner, config.autoDelay || 700);
    }
    return runner;
  }

  SOC.orient = {
    start: function (config) { markSeen(config.id); start(config); },
    attach: attach,
    end: end,
    isSeen: isSeen
  };
})();
