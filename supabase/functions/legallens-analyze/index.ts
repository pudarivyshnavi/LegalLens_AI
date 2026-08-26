import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const AI_API_KEY = Deno.env.get('AI_API_KEY') ?? '';
const AI_API_URL = Deno.env.get('AI_API_URL') ?? '';
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'gpt-4o-mini';

const ANALYSIS_PROMPT = `You are a legal document analyzer. Analyze the following legal document and return a JSON object with this exact structure. Do not include any text outside the JSON.

{
  "documentType": "string - the type of legal document",
  "summary": "string - a plain-English summary avoiding legal jargon",
  "riskScore": "number 0-100 based on detected issues",
  "riskLevel": "Low | Medium | High | Very High",
  "keyClauses": [
    {
      "name": "clause name",
      "text": "relevant original text from the document",
      "explanation": "plain-English explanation",
      "importance": "Low | Medium | High",
      "riskLevel": "Low | Medium | High"
    }
  ],
  "risks": [
    {
      "title": "risk title",
      "level": "Low | Medium | High",
      "explanation": "what the risk is",
      "clause": "which clause it relates to",
      "whyItMatters": "why it may matter",
      "suggestion": "suggested point to review"
    }
  ],
  "obligations": {
    "user": [{"text": "obligation", "type": "Payment|Deadline|Responsibility|Restriction|Deliverable"}],
    "otherParty": [{"text": "obligation", "type": "Payment|Deadline|Responsibility|Deliverable"}]
  },
  "importantDates": [
    {"label": "date label", "date": "the date", "description": "what this date means"}
  ],
  "financialTerms": [
    {"label": "term label", "value": "the value/amount", "description": "explanation"}
  ],
  "missingInformation": ["string - each missing or unclear item"]
}

Rules:
- Only include clauses, risks, obligations, dates, and financial terms that are actually present in the document.
- Do not invent information that is not in the document.
- Risk score: 0-30=Low, 31-60=Medium, 61-80=High, 81-100=Very High.
- If no information is found for a section, return an empty array.
- Return ONLY valid JSON, no markdown formatting.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, filename } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'No document text provided.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (text.length > 50000) {
      return new Response(JSON.stringify({ error: 'Document too long for AI analysis.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no AI API key configured, return error so frontend uses local fallback
    if (!AI_API_KEY || !AI_API_URL) {
      return new Response(JSON.stringify({ error: 'AI API not configured. Using local analysis.' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`${AI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          { role: 'user', content: `Document filename: ${filename}\n\nDocument text:\n${text}` },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI API request failed.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: 'Empty AI response.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the JSON from the AI response, stripping any markdown fences
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(jsonStr);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Analysis error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Analysis failed.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
