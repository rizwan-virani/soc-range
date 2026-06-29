/* SOC Range :: dataset.js
 * Replays any scenario into a flat, labeled list of records for the
 * Detection Lab. Reuses the same log engine, entities, and noise the live
 * SIEM feed uses, so what students detect matches what they saw.
 *
 * SOC.dataset.build(scenarioId, {noise}) -> { scn, records, fieldNames }
 * Each record: { _template, _origin, _truth, _mitre, t,
 *   source, severity, host, src_ip, dst_ip, user, message, raw, ...fields }
 */
(function () {
  var SOC = self.SOC || (self.SOC = {});

  function expand(scn) {
    var out = [];
    (scn.logScript || []).forEach(function (e) { out.push({ t: e.t, template: e.template, params: e.params }); });
    (scn.repeat || []).forEach(function (r) {
      for (var t = r.start; t <= r.end; t += r.every) out.push({ t: t, template: r.template, params: r.params });
    });
    (scn.finale || []).forEach(function (e) { out.push({ t: e.t, template: e.template, params: e.params }); });
    out.sort(function (a, b) { return a.t - b.t; });
    return out;
  }

  function flatten(ev, template, t) {
    var rec = {
      _template: template, _origin: ev.origin, _truth: ev.truthLabel, _mitre: ev.mitre, t: t,
      source: ev.source, severity: ev.severity, host: ev.host,
      src_ip: ev.src_ip, dst_ip: ev.dst_ip, user: ev.user,
      message: ev.msg, raw: ev.raw, mitre: ev.mitre
    };
    var f = ev.fields || {};
    for (var k in f) if (f.hasOwnProperty(k) && rec[k] === undefined) rec[k] = f[k];
    return rec;
  }

  function build(scenarioId, opts) {
    opts = opts || {};
    var scn = SOC.scenarios.byId[scenarioId];
    if (!scn) return { scn: null, records: [], fieldNames: [] };
    var LE = SOC.logEngine;
    var entities = SOC.entities.buildEntities(scn.seed);
    var rng = SOC.prng.makeRng("detect:" + scn.seed);
    var sched = expand(scn);
    var span = sched.length ? sched[sched.length - 1].t + 10 : 120;
    var base = 1700000000000;

    var records = [];
    // scenario events (the attack)
    sched.forEach(function (e) {
      var ev = LE.renderEvent({ template: e.template, params: e.params }, rng, entities, base + e.t * 1000);
      records.push(flatten(ev, e.template, e.t));
    });
    // benign noise spread across the timeline
    var noiseN = opts.noise != null ? opts.noise : 70;
    var nrng = SOC.prng.makeRng("detect-noise:" + scn.seed);
    for (var i = 0; i < noiseN; i++) {
      var nt = nrng.int(0, span);
      var ne = LE.makeNoise(nrng, entities, base + nt * 1000);
      records.push(flatten(ne, "noise", nt));
    }
    records.sort(function (a, b) { return a.t - b.t; });

    // collect field names present (for the UI field list)
    var seen = {};
    records.forEach(function (r) { for (var k in r) if (r.hasOwnProperty(k) && k[0] !== "_") seen[k] = 1; });

    return { scn: scn, records: records, fieldNames: Object.keys(seen).sort() };
  }

  SOC.dataset = { build: build };
})();
