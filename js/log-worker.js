/* SOC Range :: log-worker.js
 * Classic worker. Streams the live SIEM feed on a simulation clock so the UI
 * never blocks. Emits batches; the page keeps a capped ring buffer.
 *
 * Messages in : {cmd:"start", scenarioId, speed} | {cmd:"setSpeed", speed}
 *               {cmd:"inject", event} | {cmd:"stop"}
 * Messages out: {kind:"batch", simT, logs:[...]} | {kind:"ready"}
 */
importScripts("prng.js", "entities.js", "log-engine.js", "scenarios.data.js");

var SOC = self.SOC;
var timer = null;
var simT = 0;
var realMs = 850;        // wall time per tick
var simStep = 1;         // sim seconds per tick
var entities = null;
var noiseRng = null;
var schedule = [];       // sorted scenario events {t, template, params, severity}
var schedPtr = 0;
var injected = [];       // live instructor events queued by absolute simT

function expandSchedule(scn) {
  var out = [];
  (scn.logScript || []).forEach(function (e) { out.push(e); });
  (scn.repeat || []).forEach(function (r) {
    for (var t = r.start; t <= r.end; t += r.every) {
      out.push({ t: t, template: r.template, params: r.params, severity: r.severity });
    }
  });
  (scn.finale || []).forEach(function (e) { out.push(e); });
  out.sort(function (a, b) { return a.t - b.t; });
  return out;
}

function start(scenarioId, speed) {
  var scn = SOC.scenarios.byId[scenarioId];
  if (!scn) return;
  simT = 0;
  schedPtr = 0;
  injected = [];
  realMs = speed || 850;
  entities = SOC.entities.buildEntities(scn.seed);
  noiseRng = SOC.prng.makeRng("noise:" + scn.seed);
  schedule = expandSchedule(scn);
  if (timer) clearInterval(timer);
  timer = setInterval(tick, realMs);
  self.postMessage({ kind: "ready", scenarioId: scenarioId });
}

function tick() {
  var now = Date.now();
  var batch = [];

  // Baseline noise. Jittered count so the feed feels alive.
  var n = noiseRng.int(4, 9);
  for (var i = 0; i < n; i++) {
    batch.push(SOC.logEngine.makeNoise(noiseRng, entities, now - noiseRng.int(0, 800)));
  }

  // Due scenario events up to current simT.
  while (schedPtr < schedule.length && schedule[schedPtr].t <= simT) {
    batch.push(SOC.logEngine.renderEvent(schedule[schedPtr], noiseRng, entities, now));
    schedPtr += 1;
  }

  // Live injected events whose time has arrived.
  for (var k = injected.length - 1; k >= 0; k--) {
    if (injected[k].t <= simT) {
      batch.push(SOC.logEngine.renderEvent(injected[k].event, noiseRng, entities, now));
      injected.splice(k, 1);
    }
  }

  self.postMessage({ kind: "batch", simT: simT, logs: batch });
  simT += simStep;
}

self.onmessage = function (m) {
  var d = m.data || {};
  if (d.cmd === "start") start(d.scenarioId, d.speed);
  else if (d.cmd === "setSpeed") {
    realMs = d.speed;
    if (timer) { clearInterval(timer); timer = setInterval(tick, realMs); }
  } else if (d.cmd === "inject") {
    injected.push({ t: simT + (d.delay || 0), event: d.event });
  } else if (d.cmd === "stop") {
    if (timer) clearInterval(timer);
    timer = null;
  }
};
