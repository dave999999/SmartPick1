/** Revenue Dashboard - Integrate existing FinancialDashboardPanel */
import FinancialDashboardPanel from '@/components/admin/FinancialDashboardPanel';

export default function RevenueDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-500 mt-1">Financial metrics and commission tracking</p>
      </div>
      <FinancialDashboardPanel />
    </div>
  );
}
