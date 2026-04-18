import { supabase, json, readBody, requirePost, requireAdmin } from './_lib/supabase.js';

export async function handler(event) {
  const methodError = requirePost(event);
  if (methodError) return methodError;

  const { password, code, start, end } = await readBody(event);
  const adminCheck = requireAdmin(password);
  if (!adminCheck.ok) return json(401, { error: adminCheck.error });

  if (!code || !start || !end) return json(400, { error: 'الرمز وبداية ونهاية الحسبة مطلوبة.' });
  if (new Date(end) < new Date(start)) return json(400, { error: 'نهاية الحسبة يجب أن تكون بعد البداية.' });

  const { error } = await supabase.from('access_codes').insert({
    code: code.trim().toUpperCase(),
    starts_at: start,
    ends_at: end,
    is_active: true
  });

  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
}
