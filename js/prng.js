/* SOC Range :: prng.js
 * Deterministic pseudo-random number generation.
 * Classic script (no ES module) so it loads via importScripts inside the worker
 * and via a normal <script> tag in the page. Attaches to self.SOC.
 * self === window in a page, self === the worker global inside a worker.
 */
(function () {
  "use strict";
  var SOC = (self.SOC = self.SOC || {});

  // Hash a string seed to a 32-bit unsigned integer. Ampersand-free variant.
  function hashSeed(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 = h1 ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    return h1 >>> 0;
  }

  // Mulberry32: tiny, fast, deterministic PRNG. Returns a function -> float in [0,1).
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Build a generator object from a string seed, with handy helpers.
  function makeRng(seedString) {
    var rng = mulberry32(hashSeed(seedString));
    return {
      next: rng,
      int: function (min, max) {
        return Math.floor(rng() * (max - min + 1)) + min;
      },
      pick: function (arr) {
        return arr[Math.floor(rng() * arr.length)];
      },
      // Pick weighted: items is [{v, w}, ...]
      weighted: function (items) {
        var total = 0, i;
        for (i = 0; i < items.length; i++) total += items[i].w;
        var r = rng() * total;
        for (i = 0; i < items.length; i++) {
          r -= items[i].w;
          if (r <= 0) return items[i].v;
        }
        return items[items.length - 1].v;
      },
      bool: function (p) {
        return rng() < (p == null ? 0.5 : p);
      },
      hex: function (n) {
        var s = "", chars = "0123456789abcdef";
        for (var i = 0; i < n; i++) s += chars[Math.floor(rng() * 16)];
        return s;
      },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(rng() * (i + 1));
          var tmp = a[i];
          a[i] = a[j];
          a[j] = tmp;
        }
        return a;
      }
    };
  }

  SOC.prng = { hashSeed: hashSeed, mulberry32: mulberry32, makeRng: makeRng };
})();
