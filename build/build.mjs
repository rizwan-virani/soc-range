/* SOC Range :: build/build.mjs
 * Single source of truth is js/scenarios.data.js. This derives JSON artifacts:
 *   data/scenarios.master.json   full record, answer keys included
 *   data/scenarios.student.json  answer keys stripped, safe to expose
 * Run from the project root:  node build/build.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
globalThis.self = globalThis;

// Load the classic scripts in dependency order via indirect eval (global scope).
for (const f of ["js/prng.js", "js/entities.js", "js/log-engine.js", "js/scenarios.data.js"]) {
  (0, eval)(readFileSync(join(root, f), "utf8"));
}
const SOC = globalThis.SOC;

const master = { schemaVersion: 1, generatedAt: new Date().toISOString(), scenarios: SOC.scenarios.list };

// Deep clone helper.
const clone = (o) => JSON.parse(JSON.stringify(o));

// Strip everything that reveals an answer, producing the student-safe file.
function strip(scn) {
  const s = clone(scn);
  delete s.answerKey;
  delete s.debrief;
  (s.questions || []).forEach((q) => { delete q.answer; delete q.explain; });
  (s.playbook?.phases || []).forEach((ph) =>
    (ph.steps || []).forEach((st) => { delete st.correct; delete st.rationale; })
  );
  return s;
}

const student = { schemaVersion: 1, generatedAt: master.generatedAt, scenarios: master.scenarios.map(strip) };

writeFileSync(join(root, "data/scenarios.master.json"), JSON.stringify(master, null, 2));
writeFileSync(join(root, "data/scenarios.student.json"), JSON.stringify(student, null, 2));

console.log("Built " + master.scenarios.length + " scenarios.");
console.log("  data/scenarios.master.json  (full, with answer keys)");
console.log("  data/scenarios.student.json (answer keys stripped)");
