import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Line } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { getPartnerAnalytics } from '@/lib/api';

export default function PartnerAnalyticsCharts({ partnerId }: { partnerId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const analytics = await getPartnerAnalytics(partnerId);
      setData(analytics);
      setLoading(false);
    }
    fetchData();
  }, [partnerId]);

  if (loading) return <Card><CardContent>Loading analytics...</CardContent></Card>;
  if (!data) return <Card><CardContent>No analytics data available.</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer & Reservation Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Line data={data.trends} />
        <div className="mt-4">
          <strong>Total Revenue:</strong> {data.revenue} ₾<br />
          <strong>Next Payout:</strong> {data.nextPayout}
        </div>
      </CardContent>
    </Card>
  );
}
