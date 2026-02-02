/** System Health - Integrate existing AdminHealthPanel */
import AdminHealthPanel from '@/components/admin/AdminHealthPanel';

export default function SystemHealth() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">System Health</h1>
        <p className="text-sm text-gray-500 mt-1">Platform health and performance monitoring</p>
      </div>
      <AdminHealthPanel />
    </div>
  );
}
