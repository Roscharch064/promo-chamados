import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JIRA_DOMAIN = "datweb.atlassian.net";
const JIRA_PROJECT_KEY = "SPROMO";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titulo, descricao, tipo, prioridade, relator_nome, jira_email, jira_api_token, modulo } = await req.json();

    if (!titulo || !tipo) {
      return new Response(
        JSON.stringify({ error: "titulo and tipo are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!jira_email || !jira_api_token) {
      return new Response(
        JSON.stringify({ error: "Credenciais Jira não configuradas para este usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map tipo to Jira issue type
    const issueTypeMap: Record<string, string> = {
      bug: "Bug",
      melhoria: "Improvement",
      solicitacao: "Task",
    };

    // Map prioridade to Jira priority
    const priorityMap: Record<string, string> = {
      Critical: "Highest",
      High: "High",
      Medium: "Medium",
      Low: "Low",
    };

    const jiraPayload = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        summary: titulo,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: descricao || "Sem descrição" }],
            },
            ...(modulo ? [{
              type: "paragraph",
              content: [
                { type: "text", text: "Módulo: ", marks: [{ type: "strong" }] },
                { type: "text", text: modulo },
              ],
            }] : []),
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Relator: ", marks: [{ type: "strong" }] },
                { type: "text", text: relator_nome || "Não informado" },
              ],
            },
          ],
        },
        issuetype: { name: issueTypeMap[tipo] || "Task" },
        priority: { name: priorityMap[prioridade] || "Medium" },
      },
    };

    const auth = btoa(`${jira_email}:${jira_api_token}`);
    
    const jiraResponse = await fetch(
      `https://${JIRA_DOMAIN}/rest/api/3/issue`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(jiraPayload),
      }
    );

    const jiraData = await jiraResponse.json();

    if (!jiraResponse.ok) {
      console.error("Jira API error:", JSON.stringify(jiraData));
      throw new Error(`Jira API error [${jiraResponse.status}]: ${JSON.stringify(jiraData)}`);
    }

    return new Response(
      JSON.stringify({
        jira_key: jiraData.key,
        jira_url: `https://${JIRA_DOMAIN}/browse/${jiraData.key}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Jira issue:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
