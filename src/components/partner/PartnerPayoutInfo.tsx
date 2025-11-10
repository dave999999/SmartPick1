import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { getPartnerPayoutInfo } from '@/lib/api';

export default function PartnerPayoutInfo({ partnerId }: { partnerId: string }) {
  const [payout, setPayout] = useState<any>(null);
  useEffect(() => {
    getPartnerPayoutInfo(partnerId).then(setPayout);
  }, [partnerId]);
  if (!payout) return <Card><CardContent>Loading payout info...</CardContent></Card>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div><strong>Total Earned:</strong> {payout.totalEarned} ₾</div>
        <div><strong>Next Payout Date:</strong> {payout.nextPayoutDate}</div>
        <div><strong>Bank Account:</strong> {payout.bankAccount}</div>
      </CardContent>
    </Card>
  );
}

