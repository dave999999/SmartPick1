import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Check, X, Info } from 'lucide-react';
import { getTelegramBotLink } from '@/lib/telegram';
import { useTelegramStatus } from '@/hooks/useTelegramStatus';
import { toast } from 'sonner';

interface TelegramConnectProps {
  userId: string;
  userType: 'partner' | 'customer';
}

export function TelegramConnect({ userId, userType }: TelegramConnectProps) {
  const { connected, username, loading, disconnect } = useTelegramStatus(userId);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleConnect = () => {
    const botLink = getTelegramBotLink(userId);
    window.open(botLink, '_blank');
    toast.info('Tap START in Telegram, then return here', { duration: 4000 });
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await disconnect();
    toast.success('Telegram disconnected');
    setDisconnecting(false);
  };

  if (loading) {
    return (
      <Card className="border-gray-200">
        <CardContent className="py-3 px-4">
          <div className="text-sm text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = !!connected;

  return (
    <Card className="border-gray-200">
      <CardContent className="py-3 px-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm">Telegram Notifications</span>
            </div>
            {isConnected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>

          {isConnected ? (
            <>
              {/* Connected - Compact */}
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-md p-2.5">
                <Info className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-800 flex-1">
                  {username && <div className="font-medium">@{username}</div>}
                  <div className="text-green-700 mt-0.5">
                    Receiving {userType === 'partner' ? 'reservation alerts' : 'pickup reminders'}
                  </div>
                </div>
              </div>

              {/* Disconnect button - compact */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-3 h-3 mr-1.5" />
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </>
          ) : (
            <>
              {/* Not Connected - Compact */}
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md p-2.5">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Get instant notifications about your {userType === 'partner' ? 'reservations' : 'orders'}
                </p>
              </div>

              {/* Connect button - compact */}
              <Button
                onClick={handleConnect}
                size="sm"
                className="w-full h-9 bg-blue-500 hover:bg-blue-600 text-white text-sm"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Connect Telegram
              </Button>

              {/* Instructions - collapsible on mobile */}
              <details className="group">
                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800 list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  How to connect
                </summary>
                <ol className="mt-2 space-y-1 text-xs text-gray-600 list-decimal list-inside pl-2">
                  <li>Click Connect Telegram</li>
                  <li>Tap START in bot chat</li>
                  <li>Return here to confirm</li>
                </ol>
              </details>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

