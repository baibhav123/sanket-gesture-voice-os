// SanketX 2047 — Voice intent parser. Converts free-form spoken commands
// into structured JSON actions. Uses Lovable AI Gateway (no API key needed).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the voice control brain of SanketX 2047, a futuristic hands-free operating system.
Your job is to convert natural spoken commands into structured system actions.

RULES:
- Be fast, precise, and deterministic.
- Do NOT explain anything.
- Output ONLY JSON. No markdown, no code fences.
- If command is unclear, return: {"action": "none"}

SUPPORTED ACTION TYPES:
1. KEY PRESS: {"action":"key_press","keys":["ctrl","c"]}  (optional "repeat": N)
2. KEY HOLD:  {"action":"key_hold","key":"shift"}
3. KEY RELEASE: {"action":"key_release","key":"shift"}
4. TYPING: {"action":"type","text":"hello world"}
5. MOUSE CLICK: {"action":"mouse_click","type":"left"|"double"|"right"}
6. SCROLL: {"action":"scroll","direction":"up"|"down","amount":"small"|"medium"|"large"}
7. OPEN APP: {"action":"open_app","app":"chrome"}
8. SYSTEM: {"action":"system","type":"volume_up"|"volume_down"|"mute"|"lock"|"sleep"|"shutdown"|"restart"}
9. GRID CLICK: {"action":"grid_click","cell":5}
10. MODE: {"action":"mode","target":"mouse"|"keyboard","state":"on"|"off"}

KEY NORMALIZATION: control→ctrl, command→command, option→alt, escape→esc, return→enter.

EXAMPLES:
"press control c" → {"action":"key_press","keys":["ctrl","c"]}
"type hello bro" → {"action":"type","text":"hello bro"}
"scroll down" → {"action":"scroll","direction":"down","amount":"medium"}
"open chrome" → {"action":"open_app","app":"chrome"}
"press down 5 times" → {"action":"key_press","keys":["down"],"repeat":5}
"mouse off" → {"action":"mode","target":"mouse","state":"off"}

Return ONLY the JSON object.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { command } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: String(command || "") },
        ],
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `AI ${resp.status}: ${t.slice(0, 200)}` }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let raw = data?.choices?.[0]?.message?.content ?? "";
    raw = String(raw).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: any = { action: "none" };
    try { parsed = JSON.parse(raw); } catch { /* keep none */ }

    return new Response(JSON.stringify({ intent: parsed, raw }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
