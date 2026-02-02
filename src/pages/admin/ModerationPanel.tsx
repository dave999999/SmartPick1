/** Moderation Panel - Integrate existing component */
import { ModerationPanel } from '@/components/admin/ModerationPanel';

export default function ModerationPanelPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Moderation</h1>
        <p className="text-sm text-gray-500 mt-1">Review flagged content and user reports</p>
      </div>
      <ModerationPanel />
    </div>
  );
}
