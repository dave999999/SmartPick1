/** Messages Panel (Placeholder) */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function MessagesPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Direct messaging with users and partners</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Coming Soon - Messaging
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Admin-to-user and admin-to-partner messaging system</p>
        </CardContent>
      </Card>
    </div>
  );
}
