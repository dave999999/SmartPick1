/** Notifications Panel - Integrate existing component */
import { CommunicationPanel } from '@/components/admin/CommunicationPanel';

export default function NotificationsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Send notifications and manage campaigns</p>
      </div>
      <CommunicationPanel />
    </div>
  );
}
