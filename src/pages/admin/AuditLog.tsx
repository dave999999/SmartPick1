/** Audit Log - Integrate existing AuditLogPanel */
import AuditLogPanel from '@/components/admin/AuditLogPanel';

export default function AuditLog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">View all admin actions and system events</p>
      </div>
      <AuditLogPanel />
    </div>
  );
}
