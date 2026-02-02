/** System Settings - Integrate existing SystemConfiguration */
import SystemConfiguration from '@/components/admin/SystemConfiguration';

export default function SystemSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure platform settings and features</p>
      </div>
      <SystemConfiguration />
    </div>
  );
}
