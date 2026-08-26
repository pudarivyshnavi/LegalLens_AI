const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const AI_API_KEY = Deno.env.get('AI_API_KEY') ?? '';
const AI_API_URL = Deno.env.get('AI_API_URL') ?? '';
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini';

const CHAT_PROMPT = `You are a legal document assistant. Answer the user's question based ONLY on the provided document text and analysis. 

Rules:
- Only use information found in the document.
- If the answer cannot be found in the document, respond with: "I could not find this information in the uploaded document."
- Do not invent or assume information.
- Keep answers clear and in plain English.
- When referencing specific clauses, quote the relevant text.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, question, analysis } = await req.json();

    if (!question || typeof question !== 'string') {
      return new Response(JSON.stringify({ error: 'No question provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!AI_API_KEY || !AI_API_URL) {
      return new Response(JSON.stringify({ error: 'AI API not configured. Using local response.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Truncate document text to stay within limits
    const docText = (text || '').slice(0, 30000);
    const analysisSummary = analysis?.summary || '';

    const response = await fetch(`${AI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: CHAT_PROMPT },
          {
            role: 'user',
            content: `Document summary: ${analysisSummary}\n\nDocument text:\n${docText}\n\nQuestion: ${question}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'AI API request failed.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      return new Response(JSON.stringify({ error: 'Empty AI response.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ answer: answer.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Chat error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Chat failed.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
