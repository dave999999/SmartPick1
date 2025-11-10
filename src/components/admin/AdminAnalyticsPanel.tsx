import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getUserGrowthStats, getTopPartners, getCategoryStats } from '@/lib/api/admin-advanced';
import type { UserGrowthData, TopPartner, CategoryStats } from '@/lib/types/admin';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function AdminAnalyticsPanel() {
  const [growth, setGrowth] = useState<UserGrowthData[]>([]);
  const [topPartners, setTopPartners] = useState<TopPartner[]>([]);
  const [category, setCategory] = useState<CategoryStats[]>([]);
  const [limit, setLimit] = useState('10');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [g, tp, cs] = await Promise.all([
        getUserGrowthStats(),
        getTopPartners(parseInt(limit, 10) || 10),
        getCategoryStats(),
      ]);
      setGrowth(g);
      setTopPartners(tp);
      setCategory(cs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const growthChart = {
    labels: growth.map((d) => d.date),
    datasets: [
      {
        label: 'New Users',
        data: growth.map((d) => d.new_users),
        borderColor: '#00C896',
        backgroundColor: 'rgba(0, 200, 150, 0.2)'
      },
      {
        label: 'Cumulative Users',
        data: growth.map((d) => d.cumulative_users),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.2)'
      }
    ],
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Last 30 days signups</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-500">Loading…</div>
          ) : (
            <Line data={growthChart} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Top Partners</CardTitle>
              <CardDescription>Best performers by pickups/revenue</CardDescription>
            </div>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading…</div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Partner</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Pickups</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPartners.map((p) => (
                      <TableRow key={p.partner_id}>
                        <TableCell className="font-medium">{p.business_name}</TableCell>
                        <TableCell>{(p.total_revenue ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                        <TableCell>{p.total_pickups ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Completed pickups and revenue by category</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-gray-500">Loading…</div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Pickups</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.map((c) => (
                      <TableRow key={c.category}>
                        <TableCell className="font-medium">{c.category}</TableCell>
                        <TableCell>{c.total_pickups ?? 0}</TableCell>
                        <TableCell>{(c.total_revenue ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


