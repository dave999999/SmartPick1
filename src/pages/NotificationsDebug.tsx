import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/api';
import { getTelegramConnection } from '@/lib/telegram';
import { supabase } from '@/lib/supabase';

export default function NotificationsDebug() {
  const [userId, setUserId] = useState<string | null>(null);
  const [connection, setConnection] = useState<any>(null);
  const [loadingConn, setLoadingConn] = useState(false);
  const [partnerUserId, setPartnerUserId] = useState<string>('');
  const [log, setLog] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { user } = await getCurrentUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  const refreshConnection = async () => {
    if (!userId) return;
    setLoadingConn(true);
    try {
      const data = await getTelegramConnection(userId);
      setConnection(data);
      toast.success('Connection status refreshed');
    } catch (e: any) {
      toast.error('Failed to refresh connection');
    } finally {
      setLoadingConn(false);
    }
  };

  const sendTest = async (targetUserId: string, type: 'customer' | 'partner') => {
    try {
      const message = `[TEST] Hello from SmartPick (${type}) at ${new Date().toLocaleString()}`;
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: { userId: targetUserId, message, type },
      });
      setLog(JSON.stringify({ ok: !error, data, error }, null, 2));
      if (error || data?.success === false) {
        toast.error('Send failed – see log below');
      } else {
        toast.success('Test sent – check Telegram');
      }
    } catch (e: any) {
      setLog(`Invoke error: ${e?.message || e}`);
      toast.error('Invoke error – see log below');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Notifications Debug</CardTitle>
          <CardDescription>Validate Telegram connection and send test messages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-700">
            <div><strong>Current User ID:</strong> {userId || '(not signed in)'}</div>
            <div><strong>Bot Username:</strong> { (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || '(not set)' }</div>
          </div>

          <div className="flex gap-2">
            <Button onClick={refreshConnection} disabled={!userId || loadingConn}>Refresh My Telegram Status</Button>
            <Button onClick={() => userId && sendTest(userId, 'customer')} disabled={!userId}>Send Test (Customer)</Button>
          </div>

          <div className="text-sm bg-gray-50 rounded p-3">
            <div className="font-semibold mb-1">My Connection:</div>
            <pre className="whitespace-pre-wrap break-all">{connection ? JSON.stringify(connection, null, 2) : '(no data)'}</pre>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="font-semibold">Partner Test</div>
            <div className="flex gap-2 items-center">
              <Input placeholder="Partner user_id (UUID)" value={partnerUserId} onChange={e => setPartnerUserId(e.target.value)} />
              <Button onClick={() => partnerUserId && sendTest(partnerUserId, 'partner')} disabled={!partnerUserId}>Send Test (Partner)</Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="font-semibold mb-1">Last Result</div>
            <pre className="text-xs bg-black text-green-200 rounded p-3 overflow-auto max-h-64">{log || '(no logs yet)'}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

