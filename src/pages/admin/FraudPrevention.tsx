/** Fraud Prevention - Integrate existing ReferralFraudDashboard */
import ReferralFraudDashboard from '@/components/admin/ReferralFraudDashboard';

export default function FraudPrevention() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Fraud Prevention</h1>
        <p className="text-sm text-gray-500 mt-1">Detect referral fraud and multi-account abuse</p>
      </div>
      <ReferralFraudDashboard />
    </div>
  );
}
