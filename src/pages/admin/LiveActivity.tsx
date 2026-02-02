/** Live Activity - Integrate existing LiveMonitoring */
import { LiveMonitoring } from '@/components/admin/LiveMonitoring';

export default function LiveActivity() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Live Activity</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time platform activity monitoring</p>
      </div>
      <LiveMonitoring />
    </div>
  );
}
