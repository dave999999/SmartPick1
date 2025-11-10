import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Check, X, Bell, AlertCircle } from 'lucide-react';
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

    // Inform the user that status will update automatically
    toast.info('After tapping START in Telegram, this status will update automatically.', { duration: 6000 });
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    await disconnect();
    toast.success('Telegram disconnected successfully');
    setDisconnecting(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading Telegram connection...</div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = !!connected;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Telegram Notifications
            </CardTitle>
            <CardDescription>
              {userType === 'partner'
                ? 'Get instant alerts when customers reserve your offers'
                : 'Receive reminders and new offer alerts on Telegram'}
            </CardDescription>
          </div>
          {isConnected && (
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <Check className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            {/* Connected State */}
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Connected to Telegram!</strong>
                <div className="mt-2 text-sm">
                  {username && (
                    <div>Username: @{username}</div>
                  )}
                  <div className="mt-1 text-green-700">
                    You'll receive notifications via Telegram bot.
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* What notifications you'll receive */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                {userType === 'partner' ? "You'll receive:" : "You'll receive:"}
              </h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {userType === 'partner' ? (
                  <>
                    <li>🎉 New reservation alerts</li>
                    <li>✅ Pickup completion confirmations</li>
                    <li>❌ Customer no-show notifications</li>
                    <li>⚠️ Low stock warnings</li>
                  </>
                ) : (
                  <>
                    <li>⏰ 15-minute pickup reminders</li>
                    <li>✅ Reservation confirmations</li>
                    <li>🎁 New offers nearby (opt-in)</li>
                    <li>⚡ Special deals and promotions</li>
                  </>
                )}
              </ul>
            </div>

            {/* Disconnect button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-2" />
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Telegram notifications are not enabled.</strong>
                <div className="mt-2 text-sm">
                  Connect your Telegram to receive instant notifications about your {userType === 'partner' ? 'reservations' : 'orders'}.
                </div>
              </AlertDescription>
            </Alert>

            {/* Benefits */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2">Why connect Telegram?</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✅ Instant notifications (faster than email)</li>
                <li>✅ Works on all devices</li>
                <li>✅ Free - no SMS charges</li>
                <li>✅ Privacy-friendly</li>
                {userType === 'partner' && (
                  <li>✅ Never miss a reservation!</li>
                )}
              </ul>
            </div>

            {/* How to connect */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2 text-yellow-900">How to connect:</h4>
              <ol className="space-y-1 text-sm text-yellow-800 list-decimal list-inside">
                <li>Click "Connect Telegram" button below</li>
                <li>You'll be redirected to Telegram</li>
                <li>Click "START" in the bot chat</li>
                <li>Come back here and refresh to confirm</li>
              </ol>
            </div>

            {/* Connect button */}
            <Button
              onClick={handleConnect}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              Connect Telegram
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

