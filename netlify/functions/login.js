import { supabase, json, readBody, requirePost } from './_lib/supabase.js';
import { computeRequirements } from './_lib/requirements.js';

export async function handler(event) {
  const methodError = requirePost(event);
  if (methodError) return methodError;

  const { code } = await readBody(event);
  if (!code || typeof code !== 'string') {
    return json(400, { error: 'الرمز مطلوب.' });
  }

  const { data: accessCode, error: codeError } = await supabase
    .from('access_codes')
    .select('id, code, starts_at, ends_at, is_active')
    .eq('code', code.trim())
    .eq('is_active', true)
    .maybeSingle();

  if (codeError) return json(500, { error: codeError.message });
  if (!accessCode) return json(404, { error: 'الرمز غير موجود أو غير مفعل.' });

  const nowIso = new Date().toISOString();

  const [{ data: discount }, { data: notes }, { data: progressRow, error: progressError }] = await Promise.all([
    supabase
      .from('discounts')
      .select('id, pct, starts_at, ends_at, reason')
      .lte('starts_at', nowIso)
      .gte('ends_at', nowIso)
      .order('pct', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('notes').select('id, text, created_at').order('created_at', { ascending: false }),
    supabase.from('progress').select('reqs_done').eq('access_code_id', accessCode.id).maybeSingle()
  ]);

  if (progressError && progressError.code !== 'PGRST116') {
    return json(500, { error: progressError.message });
  }

  return json(200, {
    codeData: accessCode,
    discount: discount || null,
    notes: notes || [],
    requirements: computeRequirements(discount || null),
    progress: progressRow?.reqs_done || {}
  });
}
