/** Analytics Dashboard - Integrate existing component */
import AdvancedAnalyticsDashboard from '@/components/admin/AdvancedAnalyticsDashboard';
import { Suspense } from 'react';

export default function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Platform metrics and insights</p>
      </div>
      <Suspense fallback={<div>Loading analytics...</div>}>
        <AdvancedAnalyticsDashboard />
      </Suspense>
    </div>
  );
}
