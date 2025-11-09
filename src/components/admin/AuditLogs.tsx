import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAuditLogs } from '@/lib/api/admin-advanced';
import type { AuditLog } from '@/lib/types/admin';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(limit);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const filtered = logs.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(q) ||
      l.resource_type?.toLowerCase().includes(q) ||
      l.resource_id?.toLowerCase().includes(q) ||
      (l.admin?.email?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Recent admin actions</CardDescription>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search actions, resource, admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Input
            type="number"
            min={10}
            max={1000}
            value={limit}
            onChange={(e) => setLimit(Math.max(10, Math.min(1000, parseInt(e.target.value) || 100)))}
            className="w-24"
          />
          <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell>{log.admin?.email || log.admin_id}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.resource_type}{log.resource_id ? `:${log.resource_id}` : ''}</TableCell>
                  <TableCell>
                    <pre className="text-xs whitespace-pre-wrap break-words">{log.details ? JSON.stringify(log.details) : ''}</pre>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

