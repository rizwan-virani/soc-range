/* SOC Range :: optional tutor proxy (Cloudflare Worker)
 *
 * The AI tutor works without this, in client-side guide mode. Deploy this only
 * if you want the tutor backed by a real Claude model. It keeps your Anthropic
 * API key server-side so it never ships to students' browsers.
 *
 * Deploy steps:
 *   1. Create a Cloudflare account and install Wrangler:  npm i -g wrangler
 *   2. Save this file as src/worker.js in a new folder with a wrangler.toml:
 *        name = "soc-tutor"
 *        main = "src/worker.js"
 *        compatibility_date = "2024-11-01"
 *   3. Set your key as a secret:   wrangler secret put ANTHROPIC_API_KEY
 *   4. Lock CORS to your Pages origin: set ALLOWED_ORIGIN below.
 *   5. Deploy:  wrangler deploy
 *   6. In soc.html, set:  window.SOC_TUTOR_ENDPOINT = "https://soc-tutor.<you>.workers.dev";
 *
 * Cost control: this caps max_tokens and only forwards short tutor prompts.
 */

const ALLOWED_ORIGIN = "*"; // change to "https://YOUR-ORG.github.io" in production

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, cors); }

    const payload = {
      model: body.model || "claude-sonnet-4-6",
      max_tokens: Math.min(body.max_tokens || 300, 500),
      system: String(body.system || "You are a helpful SOC analyst tutor.").slice(0, 4000),
      messages: (body.messages || []).slice(-6)
    };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    return json(data, 200, cors);
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors }
  });
}
