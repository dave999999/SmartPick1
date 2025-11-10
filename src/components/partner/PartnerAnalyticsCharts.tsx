import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// Explicit Chart.js registration to avoid runtime error: "category is not a registered scale"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
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
        <Line
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
        <div className="mt-4">
          <strong>Total Revenue:</strong> {data.revenue} ₾<br />
          <strong>Next Payout:</strong> {data.nextPayout}
        </div>
      </CardContent>
    </Card>
  );
}

