/**
 * Support Tickets Page ★ COMPLETED
 * Manages contact_submissions from Contact.tsx with full workflow
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LifeBuoy,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  useTickets,
  useTicketStats,
  useAssignTicket,
  useUpdateTicketStatus,
  useResolveTicket,
  TicketFilters,
} from '@/hooks/admin/useTickets';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { PermissionGuard } from '@/components/admin/PermissionGuard';
import { TicketDetailDialog } from '@/components/admin/TicketDetailDialog';
import { useAuth } from '@/hooks/useAuth';

export default function SupportTickets() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<TicketFilters>({
    page: 1,
    limit: 50,
  });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useTickets(filters);
  const { data: stats } = useTicketStats();
  const assignTicket = useAssignTicket();
  const updateStatus = useUpdateTicketStatus();
  const resolveTicket = useResolveTicket();

  const handleSearch = (search: string) => {
    setFilters({ ...filters, page: 1 });
  };

  const handleStatusFilter = (status: string) => {
    setFilters({
      ...filters,
      status: status === 'all' ? undefined : (status as any),
      page: 1,
    });
  };

  const handlePriorityFilter = (priority: string) => {
    setFilters({
      ...filters,
      priority: priority === 'all' ? undefined : (priority as any),
      page: 1,
    });
  };

  const handleAssignToMe = (ticketId: string) => {
    if (!user) return;
    assignTicket.mutate({ ticketId, adminId: user.id });
  };

  const handleResolve = (ticketId: string) => {
    resolveTicket.mutate({ ticketId });
  };

  const getSLABadge = (ticket: any) => {
    if (!ticket.sla_due_at || ticket.status === 'resolved' || ticket.status === 'closed') {
      return null;
    }

    const now = new Date();
    const slaDue = new Date(ticket.sla_due_at);
    const timeLeft = slaDue.getTime() - now.getTime();
    const hoursLeft = timeLeft / (1000 * 60 * 60);

    if (timeLeft < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          SLA Breached
        </Badge>
      );
    } else if (hoursLeft < 1) {
      return (
        <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
          <Clock className="h-3 w-3 mr-1" />
          {Math.floor(timeLeft / (1000 * 60))}m left
        </Badge>
      );
    } else if (hoursLeft < 2) {
      return (
        <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          {Math.floor(hoursLeft)}h left
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-xs text-gray-600">
        <Clock className="h-3 w-3 mr-1" />
        {formatDistanceToNow(slaDue, { addSuffix: true })}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
            Pending
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
            In Progress
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="text-xs text-gray-500">
            Closed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <Badge variant="destructive" className="text-xs">
            Urgent
          </Badge>
        );
      case 'high':
        return (
          <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="text-xs text-gray-600">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="h-6 w-6" />
            Support Tickets
          </h1>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="h-6 w-6" />
            Support Tickets
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              ✓ ACTIVE
            </Badge>
          </h1>
          <p className="text-sm text-gray-500 mt-1">{data?.total || 0} total tickets</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total Tickets</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.total_tickets || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Unassigned</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {stats?.unassigned_tickets || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Pending</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {stats?.pending_tickets || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">SLA At Risk</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {stats?.sla_at_risk || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Resolved Today</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {stats?.resolved_today || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Quick Views */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.unassigned ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, unassigned: !filters.unassigned })}
              >
                Unassigned
              </Button>
              <Button
                variant={filters.slaAtRisk ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFilters({ ...filters, slaAtRisk: !filters.slaAtRisk })}
              >
                SLA At Risk
              </Button>
            </div>

            {/* Status Filter */}
            <Select value={filters.status || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={filters.priority || 'all'} onValueChange={handlePriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Ticket ID</TableHead>
              <TableHead className="w-[250px]">User</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.tickets.map((ticket) => (
              <TableRow key={ticket.id} className="hover:bg-gray-50">
                {/* Ticket ID */}
                <TableCell className="font-mono text-sm">{ticket.ticket_id}</TableCell>

                {/* User Info */}
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">{ticket.full_name}</div>
                    <div className="text-sm text-gray-500">{ticket.email}</div>
                  </div>
                </TableCell>

                {/* Subject */}
                <TableCell>
                  <div>
                    <Badge variant="outline" className="text-xs mb-1">
                      {ticket.topic}
                    </Badge>
                    <div className="text-sm text-gray-900 line-clamp-2">
                      {ticket.message.slice(0, 80)}
                      {ticket.message.length > 80 && '...'}
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>

                {/* Priority */}
                <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>

                {/* SLA */}
                <TableCell>{getSLABadge(ticket)}</TableCell>

                {/* Assigned To */}
                <TableCell>
                  {ticket.assigned_admin ? (
                    <div className="text-sm text-gray-900">
                      {ticket.assigned_admin.name}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Unassigned</span>
                  )}
                </TableCell>

                {/* Created */}
                <TableCell className="text-sm text-gray-500">
                  {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <PermissionGuard permission="tickets:view_details">
                        <DropdownMenuItem onClick={() => setSelectedTicketId(ticket.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </PermissionGuard>

                      <PermissionGuard permission="tickets:assign">
                        {!ticket.assigned_to && (
                          <DropdownMenuItem onClick={() => handleAssignToMe(ticket.id)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign to Me
                          </DropdownMenuItem>
                        )}
                      </PermissionGuard>

                      <PermissionGuard permission="tickets:resolve">
                        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleResolve(ticket.id)}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </DropdownMenuItem>
                          </>
                        )}
                      </PermissionGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Empty State */}
        {data?.tickets.length === 0 && (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No tickets found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or check back later
            </p>
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <div className="text-sm text-gray-500">
              Showing {(filters.page! - 1) * filters.limit! + 1} to{' '}
              {Math.min(filters.page! * filters.limit!, data.total)} of {data.total} tickets
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page! - 1 })}
              >
                Previous
              </Button>
              <div className="text-sm text-gray-600">
                Page {filters.page} of {data.pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page === data.pages}
                onClick={() => setFilters({ ...filters, page: filters.page! + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Ticket Detail Dialog */}
      {selectedTicketId && (
        <TicketDetailDialog
          ticketId={selectedTicketId}
          open={!!selectedTicketId}
          onOpenChange={(open) => !open && setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}
