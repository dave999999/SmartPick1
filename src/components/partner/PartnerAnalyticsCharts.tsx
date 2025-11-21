import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useEffect, useState, lazy, Suspense } from 'react';

// Lazy load chart.js + react-chartjs-2 only when analytics actually mount
const LineChartLib = lazy(async () => {
  const mod = await import('react-chartjs-2');
  const chartCore = await import('chart.js');
  chartCore.Chart.register(
    chartCore.CategoryScale,
    chartCore.LinearScale,
    chartCore.PointElement,
    chartCore.LineElement,
    chartCore.Title,
    chartCore.Tooltip,
    chartCore.Legend
  );
  return { default: mod.Line };
});
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
        <Suspense fallback={<div className="py-8 text-center text-gray-400">Loading chart…</div>}>
          <LineChartLib
            data={data.trends}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: 'bottom' },
                title: { display: false }
              },
              scales: {
                x: { display: true, title: { display: true, text: 'Date' } },
                y: { display: true, title: { display: true, text: 'Count' }, beginAtZero: true }
              }
            }}
            height={300}
          />
        </Suspense>
        <div className="mt-4">
          <strong>Total Revenue:</strong> {data.revenue} ₾<br />
          <strong>Next Payout:</strong> {data.nextPayout}
        </div>
      </CardContent>
    </Card>
  );
}

