import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

type HealthState = {
  ok: boolean;
  latency_ms?: number;
  cron?: { status?: string };
  bot?: { telegram?: string };
  timestamp?: string;
  error?: string;
};

export default function AdminHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthState | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Try supabase edge functions invoke first
      const { data, error } = await supabase.functions.invoke('admin/get-system-health');
      if (error) throw error;
      setHealth((data as any) || null);
    } catch (e) {
      // Fallback to fetch if invoke not available locally
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/functions/v1/admin/get-system-health', {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        const json = await res.json();
        setHealth(json);
      } catch (err) {
        setHealth({ ok: false, error: String(err) });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const statusBadge = (ok?: boolean) => (
    <Badge className={ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
      {ok ? 'OK' : 'ISSUE'}
    </Badge>
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-4">
        <div>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Latency, cron and bot signals</CardDescription>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-gray-500">Checking health…</div>
        ) : !health ? (
          <div className="py-10 text-center text-red-600">No health data</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-600">Overall</div>
              <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
                Status {statusBadge(health.ok)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{health.timestamp ? new Date(health.timestamp).toLocaleString() : ''}</div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-600">Latency</div>
              <div className="mt-1 text-lg font-semibold">{health.latency_ms ?? '—'} ms</div>
              <div className="text-xs text-gray-500 mt-1">Edge function roundtrip</div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-600">Workers</div>
              <div className="mt-1 text-lg font-semibold">Cron: {health.cron?.status ?? 'unknown'}</div>
              <div className="text-sm">Telegram: {health.bot?.telegram ?? 'unknown'}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

