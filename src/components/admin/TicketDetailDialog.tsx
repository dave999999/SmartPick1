/**
 * Ticket Detail Dialog ★ COMPLETED
 * Full conversation view with assign, reply, and resolve capabilities
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Mail,
  Phone,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Send,
  CheckCircle,
  AlertTriangle,
  Lock,
  UserPlus,
  Flag,
} from 'lucide-react';
import {
  useTicket,
  useTicketMessages,
  useAssignTicket,
  useAddTicketMessage,
  useResolveTicket,
  useUpdateTicketStatus,
  useUpdateTicketPriority,
} from '@/hooks/admin/useTickets';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PermissionGuard } from '@/components/admin/PermissionGuard';

interface TicketDetailDialogProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailDialog({
  ticketId,
  open,
  onOpenChange,
}: TicketDetailDialogProps) {
  const { user } = useAuth();
  const { data: ticket, isLoading } = useTicket(ticketId);
  const { data: messages } = useTicketMessages(ticketId);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const assignTicket = useAssignTicket();
  const addMessage = useAddTicketMessage();
  const resolveTicket = useResolveTicket();
  const updateStatus = useUpdateTicketStatus();
  const updatePriority = useUpdateTicketPriority();

  const handleAssignToMe = () => {
    if (!user) return;
    assignTicket.mutate({ ticketId, adminId: user.id });
  };

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;

    addMessage.mutate(
      {
        ticketId,
        message: replyMessage,
        isInternal,
      },
      {
        onSuccess: () => {
          setReplyMessage('');
          setIsInternal(false);
        },
      }
    );
  };

  const handleResolve = () => {
    resolveTicket.mutate(
      {
        ticketId,
        resolutionNotes: resolutionNotes || undefined,
      },
      {
        onSuccess: () => {
          setResolutionNotes('');
        },
      }
    );
  };

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ ticketId, status: status as any });
  };

  const handlePriorityChange = (priority: string) => {
    updatePriority.mutate({ ticketId, priority: priority as any });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
            Pending
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            In Progress
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="text-gray-500">
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
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Urgent
          </Badge>
        );
      case 'high':
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Medium
          </Badge>
        );
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const getSLAStatus = () => {
    if (!ticket?.sla_due_at || ticket.status === 'resolved' || ticket.status === 'closed') {
      return null;
    }

    const now = new Date();
    const slaDue = new Date(ticket.sla_due_at);
    const timeLeft = slaDue.getTime() - now.getTime();

    if (timeLeft < 0) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">SLA Breached</span>
          <span className="text-xs">
            {formatDistanceToNow(slaDue, { addSuffix: true })}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-600">
        <Clock className="h-4 w-4" />
        <span className="text-sm">SLA Due:</span>
        <span className="text-sm font-medium">
          {formatDistanceToNow(slaDue, { addSuffix: true })}
        </span>
      </div>
    );
  };

  if (isLoading || !ticket) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Ticket #{ticket.ticket_id}</span>
              {getStatusBadge(ticket.status)}
              {getPriorityBadge(ticket.priority)}
            </div>
            <div className="flex items-center gap-2">
              <PermissionGuard permission="tickets:update_priority">
                <Select
                  value={ticket.priority}
                  onValueChange={handlePriorityChange}
                  disabled={updatePriority.isPending}
                >
                  <SelectTrigger className="w-[130px] h-8">
                    <Flag className="h-3 w-3 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </PermissionGuard>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Left: Conversation Thread */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* SLA Status */}
            {getSLAStatus() && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-3">{getSLAStatus()}</CardContent>
              </Card>
            )}

            {/* Original Message */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {ticket.full_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {ticket.full_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {ticket.topic}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {ticket.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {messages?.map((msg) => (
                <Card
                  key={msg.id}
                  className={cn(
                    msg.is_internal && 'bg-yellow-50 border-yellow-200'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            msg.sender_type === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          )}
                        >
                          {msg.sender_type === 'admin' ? 'A' : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {msg.sender_type === 'admin' ? 'Admin' : 'User'}
                          </span>
                          {msg.is_internal && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300"
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Internal
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Reply Box */}
            <PermissionGuard permission="tickets:reply">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Reply to Ticket</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isInternal}
                        onCheckedChange={setIsInternal}
                        id="internal-note"
                      />
                      <Label
                        htmlFor="internal-note"
                        className="text-sm text-gray-600 cursor-pointer"
                      >
                        <Lock className="h-3 w-3 inline mr-1" />
                        Internal Note
                      </Label>
                    </div>
                  </div>
                  <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={
                      isInternal
                        ? 'Add an internal note (not visible to user)...'
                        : 'Type your reply to the user...'
                    }
                    rows={3}
                    className={cn(
                      isInternal && 'bg-yellow-50 border-yellow-300'
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim() || addMessage.isPending}
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isInternal ? 'Add Note' : 'Send Reply'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </PermissionGuard>
          </div>

          {/* Right: Ticket Info Sidebar */}
          <Card className="w-80 overflow-y-auto">
            <CardContent className="p-4 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{ticket.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a
                      href={`mailto:${ticket.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {ticket.email}
                    </a>
                  </div>
                  {ticket.phone_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a
                        href={`tel:${ticket.phone_number}`}
                        className="text-blue-600 hover:underline"
                      >
                        {ticket.phone_number}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Assignment */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Assignment
                </h3>
                {ticket.assigned_admin ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        {ticket.assigned_admin.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.assigned_admin.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ticket.assigned_admin.email}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mb-2">Unassigned</div>
                )}
                <PermissionGuard permission="tickets:assign">
                  {!ticket.assigned_admin && (
                    <Button
                      onClick={handleAssignToMe}
                      disabled={assignTicket.isPending}
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign to Me
                    </Button>
                  )}
                </PermissionGuard>
              </div>

              <Separator />

              {/* Status Management */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Status Management
                </h3>
                <PermissionGuard permission="tickets:update_status">
                  <Select
                    value={ticket.status}
                    onValueChange={handleStatusChange}
                    disabled={updateStatus.isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </PermissionGuard>
              </div>

              {/* Resolve Section */}
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <PermissionGuard permission="tickets:resolve">
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Resolve Ticket
                      </h3>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Add resolution notes (optional)..."
                        rows={3}
                        className="mb-2"
                      />
                      <Button
                        onClick={handleResolve}
                        disabled={resolveTicket.isPending}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Resolved
                      </Button>
                    </div>
                  </>
                </PermissionGuard>
              )}

              {/* Resolution Info */}
              {ticket.resolved_at && ticket.resolved_admin && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Resolution Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Resolved by:</span>
                        <div className="font-medium text-gray-900 mt-1">
                          {ticket.resolved_admin.name}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Resolved on:</span>
                        <div className="font-medium text-gray-900 mt-1">
                          {format(
                            new Date(ticket.resolved_at),
                            'MMM d, yyyy h:mm a'
                          )}
                        </div>
                      </div>
                      {ticket.internal_notes && (
                        <div>
                          <span className="text-gray-600">Notes:</span>
                          <div className="text-gray-900 mt-1 whitespace-pre-wrap">
                            {ticket.internal_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
