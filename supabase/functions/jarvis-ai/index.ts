// SanketX 2047 — Jarvis AI brain (ChatX / Dhamala Tech gateway)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHATX_URL = "https://api.dhamalatech.com/v1/chat/completions";
const CHATX_MODEL = "Chatx";

const PERSONAS = {
  jarvis: "You are J.A.R.V.I.S., a futuristic AI assistant from SanketX 2047. Respond in 1-2 short sentences, calm, precise, slightly formal. Address the user as 'Sir' occasionally. Never use markdown.",
  coder: "You are an elite code generator. Output ONLY raw source code — no explanations, no markdown fences, no comments unless essential. Pick the most appropriate language for the request. Production-ready, clean, runnable.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, mode } = await req.json();
    const KEY = Deno.env.get("CHATX_API_KEY");
    if (!KEY) throw new Error("CHATX_API_KEY missing");

    const persona = mode === "code" ? PERSONAS.coder : PERSONAS.jarvis;

    const resp = await fetch(CHATX_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHATX_MODEL,
        messages: [
          { role: "system", content: persona },
          { role: "user", content: String(question || "") },
        ],
        temperature: mode === "code" ? 0.2 : 0.7,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("ChatX error", resp.status, t);
      return new Response(JSON.stringify({ error: `ChatX ${resp.status}: ${t.slice(0, 200)}` }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const answer =
      data?.choices?.[0]?.message?.content ??
      data?.message ??
      data?.response ??
      data?.answer ??
      "I have no response, Sir.";
    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
