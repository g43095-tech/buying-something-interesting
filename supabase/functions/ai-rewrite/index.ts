// Supabase Edge Function: שכתוב כותרת/תיאור/הסבר עם Gemini, למנהלים בלבד.
// פריסה:  supabase functions deploy ai-rewrite
// סוד:    supabase secrets set GEMINI_API_KEY=...
// אופציונלי: supabase secrets set SHOP_ORIGIN=https://your-shop.pages.dev

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CATEGORIES = ['בית ומטבח', 'גאדג׳טים', 'ארגון ואחסון', 'רכב', 'טיפוח ופנאי', 'כלי עבודה'];
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': Deno.env.get('SHOP_ORIGIN') || '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!supabaseUrl || !anonKey) return json({ error: 'server_misconfigured' }, 500);

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false }
  });

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData?.user?.email) return json({ error: 'unauthorized' }, 401);

  const { data: adminRow } = await client
    .from('admins')
    .select('email')
    .eq('email', userData.user.email)
    .maybeSingle();
  if (!adminRow) return json({ error: 'forbidden' }, 403);

  let payload: { title?: string; description?: string; category?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const title = String(payload.title || '').slice(0, 300);
  const description = String(payload.description || '').slice(0, 1200);
  const category = String(payload.category || '').slice(0, 60);
  if (!title) return json({ error: 'missing_title' }, 400);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return json({ error: 'missing_gemini_key' }, 500);

  const prompt = `אתה עורך תוכן של חנות מוצרים קטנה בעברית. שכתב את הטקסט כך שיהיה קצר, ענייני ואנושי, בלי סופרלטיבים מוגזמים ובלי אימוג'ים.
כותרת מקורית: ${title}
תיאור מקורי: ${description || '(אין)'}
קטגוריה נוכחית: ${category || '(לא ידועה)'}

החזר JSON בלבד, בלי markdown:
{"title":"כותרת בעברית עד 6 מילים, תיאורית ולא שיווקית","description":"שני משפטים קצרים: מה המוצר עושה ולמי הוא מתאים","why":"משפט קצר שמסביר למה בחרנו דווקא במוצר הזה, בלי להמציא נתונים","category":"אחת מהקטגוריות: ${CATEGORIES.join(' | ')}"}`;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6, responseMimeType: 'application/json' }
          })
        }
      );
      if (!response.ok) continue;

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
      if (!parsed?.title) continue;

      return json({
        title: String(parsed.title).slice(0, 120),
        description: String(parsed.description || '').slice(0, 600),
        why: String(parsed.why || '').slice(0, 300),
        category: CATEGORIES.includes(parsed.category) ? parsed.category : category
      });
    } catch {
      // מנסה את המודל הבא
    }
  }

  return json({ error: 'gemini_failed' }, 502);
});
