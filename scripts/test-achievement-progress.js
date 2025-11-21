/*
 * Achievement Progress Test Script
 * Usage (PowerShell):
 *   $env:USER_ID="<uuid>"; pnpm test:achievements
 *
 * This will output each achievement's current vs target progress and unlocked status.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const USER_ID = process.env.USER_ID;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}
if (!USER_ID) {
  console.error('Set USER_ID env var to test a specific user');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function calcProgress(def, stats) {
  const req = def.requirement;
  switch (req.type) {
    case 'reservations':
      return { current: stats.total_reservations || 0, target: req.count || 1 };
    case 'money_saved':
      return { current: Math.floor(stats.total_money_saved || 0), target: req.amount || 1 };
    case 'category':
      return { current: (stats.category_counts?.[req.name] || 0), target: req.count || 1 };
    case 'unique_partners':
      return { current: stats.unique_partners_visited || 0, target: req.count || 1 };
    case 'partner_loyalty':
      const maxVisits = stats.partner_visit_counts ? Math.max(...Object.values(stats.partner_visit_counts).map(v => Number(v) || 0), 0) : 0;
      return { current: maxVisits, target: req.count || 1 };
    case 'streak':
      return { current: stats.current_streak_days || 0, target: req.days || 1 };
    case 'referrals':
      return { current: stats.total_referrals || 0, target: req.count || 1 };
    default:
      return { current: 0, target: 1 };
  }
}

async function run() {
  console.log(`🔍 Checking achievement progress for user ${USER_ID}`);
  const { data: stats, error: statsErr } = await supabase.from('user_stats').select('*').eq('user_id', USER_ID).single();
  if (statsErr) { console.error('stats error', statsErr); process.exit(1); }

  const { data: defs, error: defsErr } = await supabase.from('achievement_definitions').select('*').eq('is_active', true);
  if (defsErr) { console.error('defs error', defsErr); process.exit(1); }

  const { data: userAch, error: uaErr } = await supabase.from('user_achievements').select('*').eq('user_id', USER_ID);
  if (uaErr) { console.error('user achievements error', uaErr); process.exit(1); }

  const unlockedIds = new Set(userAch.map(a => a.achievement_id));

  defs.forEach(def => {
    const { current, target } = calcProgress(def, stats);
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const unlocked = unlockedIds.has(def.id);
    console.log(`${unlocked ? '✅' : '🔒'} ${def.icon} ${def.name.padEnd(18)} ${String(current).padStart(4)}/${target} (${pct}% )${unlocked ? ' +'+def.reward_points+'pts' : ''}`);
  });

  console.log('\nTotal unlocked:', unlockedIds.size, '/', defs.length);
}

run();
