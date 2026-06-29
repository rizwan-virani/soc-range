/* SOC Range :: branch.js
 * Pure resolver for the Live Response branching trees. No DOM. The page
 * controller manages score, the countdown timer, and rendering.
 */
(function () {
  var SOC = self.SOC || (self.SOC = {});

  function byScenario(id) { return (SOC.branches || {})[id] || null; }

  function resolve(tree, nodeId, optionId) {
    var node = tree.nodes[nodeId];
    if (!node) return null;
    var opt = null;
    for (var i = 0; i < node.options.length; i++) if (node.options[i].id === optionId) opt = node.options[i];
    if (!opt) return null;
    var isEnding = !!(tree.endings && tree.endings[opt.to]);
    return { delta: opt.delta || 0, note: opt.note || "", nextId: opt.to, isEnding: isEnding, label: opt.label };
  }

  function grade(score) {
    return score >= 100 ? "A" : score >= 85 ? "B" : score >= 70 ? "C" : score >= 50 ? "D" : "F";
  }

  function list() {
    var ids = Object.keys(SOC.branches || {});
    return ids.map(function (id) {
      var scn = SOC.scenarios && SOC.scenarios.byId[id];
      return { id: id, title: scn ? scn.title : id, tier: scn ? scn.tier : "", intro: SOC.branches[id].intro };
    });
  }

  SOC.branch = { byScenario: byScenario, resolve: resolve, grade: grade, list: list };
})();
