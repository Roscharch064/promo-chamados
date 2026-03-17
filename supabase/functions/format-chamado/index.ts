import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { descricao, tipo, modulo } = await req.json();

    if (!descricao || !tipo) {
      return new Response(
        JSON.stringify({ error: "descricao and tipo are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um assistente especializado em formatação de chamados técnicos para o sistema Jira do PromoBank.

Dado um texto descritivo de um problema ou solicitação, você deve retornar um JSON com:
- "titulo": Título padronizado no formato "[Módulo]: Descrição objetiva" (máx 80 chars)
- "descricao_formatada": Descrição estruturada com seções: Problema, Passos para Reproduzir (se aplicável), Ambiente, Impacto
- "prioridade": "Critical", "High", "Medium" ou "Low"
- "modulo_inferido": Módulo do sistema afetado (Login, Cadastros, Consultas, Relatórios, Dashboard, Campanhas, FGTS, Pagamentos, Configurações)

Tipo do chamado: ${tipo === "bug" ? "Bug" : tipo === "melhoria" ? "Melhoria" : "Solicitação"}
${modulo ? `Módulo informado: ${modulo}` : ""}

Responda APENAS com JSON válido, sem markdown.`;

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: descricao },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway error [${response.status}]: ${errorText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        titulo: `[${modulo || "Geral"}]: ${descricao.slice(0, 60)}`,
        descricao_formatada: descricao,
        prioridade: tipo === "bug" ? "High" : "Medium",
        modulo_inferido: modulo || "Geral",
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in format-chamado:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
