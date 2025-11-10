import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckSquare, Trash2, Ban, CheckCircle, XCircle, Download, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { checkServerRateLimit } from '@/lib/rateLimiter-server';

interface BulkActionsProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onActionComplete: () => void;
  entityType: 'partners' | 'users' | 'offers';
  totalCount: number;
}

export function BulkActions({
  selectedIds,
  onClearSelection,
  onActionComplete,
  entityType,
  totalCount
}: BulkActionsProps) {
  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState<string>('');

  const handleBulkAction = async () => {
    if (!action) {
      toast.error('Please select an action');
      return;
    }

    if (selectedIds.size === 0) {
      toast.error('No items selected');
      return;
    }

    // Rate limit check for admin actions
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const rateCheck = await checkServerRateLimit('admin_action', user.id);
      if (!rateCheck.allowed) {
        toast.error('Too many admin actions. Please slow down.');
        return;
      }
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedIds.size} ${entityType}?`;
    if (!confirm(confirmMessage)) return;

    try {
      setProcessing(true);
      const ids = Array.from(selectedIds);
      let successCount = 0;
      let failCount = 0;

      switch (action) {
        case 'delete':
          for (const id of ids) {
            const { error } = await supabase
              .from(entityType)
              .delete()
              .eq('id', id);
            
            if (error) {
              console.error(`Failed to delete ${id}:`, error);
              failCount++;
            } else {
              successCount++;
            }
          }
          break;

        case 'approve':
          if (entityType === 'partners') {
            for (const id of ids) {
              const { error } = await supabase
                .from('partners')
                .update({ approval_status: 'APPROVED', status: 'ACTIVE' })
                .eq('id', id);
              
              if (error) {
                console.error(`Failed to approve ${id}:`, error);
                failCount++;
              } else {
                successCount++;
              }
            }
          }
          break;

        case 'reject':
          if (entityType === 'partners') {
            for (const id of ids) {
              const { error } = await supabase
                .from('partners')
                .update({ approval_status: 'REJECTED', status: 'INACTIVE' })
                .eq('id', id);
              
              if (error) {
                console.error(`Failed to reject ${id}:`, error);
                failCount++;
              } else {
                successCount++;
              }
            }
          }
          break;

        case 'disable':
          const statusField = entityType === 'users' ? 'is_active' : 'status';
          const statusValue = entityType === 'users' ? false : 'INACTIVE';
          
          for (const id of ids) {
            const { error } = await supabase
              .from(entityType)
              .update({ [statusField]: statusValue })
              .eq('id', id);
            
            if (error) {
              console.error(`Failed to disable ${id}:`, error);
              failCount++;
            } else {
              successCount++;
            }
          }
          break;

        case 'enable':
          const enableField = entityType === 'users' ? 'is_active' : 'status';
          const enableValue = entityType === 'users' ? true : 'ACTIVE';
          
          for (const id of ids) {
            const { error } = await supabase
              .from(entityType)
              .update({ [enableField]: enableValue })
              .eq('id', id);
            
            if (error) {
              console.error(`Failed to enable ${id}:`, error);
              failCount++;
            } else {
              successCount++;
            }
          }
          break;

        case 'pause':
          if (entityType === 'offers') {
            for (const id of ids) {
              const { error } = await supabase
                .from('offers')
                .update({ status: 'PAUSED' })
                .eq('id', id);
              
              if (error) {
                console.error(`Failed to pause ${id}:`, error);
                failCount++;
              } else {
                successCount++;
              }
            }
          }
          break;

        case 'resume':
          if (entityType === 'offers') {
            for (const id of ids) {
              const { error } = await supabase
                .from('offers')
                .update({ status: 'ACTIVE' })
                .eq('id', id);
              
              if (error) {
                console.error(`Failed to resume ${id}:`, error);
                failCount++;
              } else {
                successCount++;
              }
            }
          }
          break;

        case 'export':
          await handleExport(ids);
          successCount = ids.length;
          break;

        case 'send-email':
          toast.info('Email notification feature coming soon!');
          return;

        default:
          toast.error('Unknown action');
          return;
      }

      if (successCount > 0) {
        toast.success(`✅ ${successCount} ${entityType} ${action}d successfully!`);
      }
      if (failCount > 0) {
        toast.error(`❌ ${failCount} ${entityType} failed`);
      }

      onActionComplete();
      onClearSelection();
      setAction('');
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error(`Failed to ${action} ${entityType}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async (ids: string[]) => {
    try {
      // Fetch data for selected ids
      const { data, error } = await supabase
        .from(entityType)
        .select('*')
        .in('id', ids);

      if (error) throw error;

      // Convert to CSV
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => 
          Object.values(row).map(val => 
            typeof val === 'string' && val.includes(',') ? `"${val}"` : val
          ).join(',')
        );
        const csv = [headers, ...rows].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${entityType}-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${data.length} ${entityType} to CSV`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const getAvailableActions = () => {
    const common = [
      { value: 'export', label: 'Export to CSV', icon: <Download className="h-4 w-4" /> },
      { value: 'delete', label: 'Delete Selected', icon: <Trash2 className="h-4 w-4" />, destructive: true },
    ];

    switch (entityType) {
      case 'partners':
        return [
          { value: 'approve', label: 'Approve All', icon: <CheckCircle className="h-4 w-4" /> },
          { value: 'reject', label: 'Reject All', icon: <XCircle className="h-4 w-4" /> },
          { value: 'disable', label: 'Disable All', icon: <Ban className="h-4 w-4" /> },
          { value: 'enable', label: 'Enable All', icon: <CheckSquare className="h-4 w-4" /> },
          { value: 'send-email', label: 'Send Email', icon: <Mail className="h-4 w-4" /> },
          ...common,
        ];

      case 'users':
        return [
          { value: 'disable', label: 'Disable All', icon: <Ban className="h-4 w-4" /> },
          { value: 'enable', label: 'Enable All', icon: <CheckSquare className="h-4 w-4" /> },
          { value: 'send-email', label: 'Send Email', icon: <Mail className="h-4 w-4" /> },
          ...common,
        ];

      case 'offers':
        return [
          { value: 'pause', label: 'Pause All', icon: <Ban className="h-4 w-4" /> },
          { value: 'resume', label: 'Resume All', icon: <CheckSquare className="h-4 w-4" /> },
          ...common,
        ];

      default:
        return common;
    }
  };

  if (selectedIds.size === 0) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-900">Bulk Actions</CardTitle>
            <CardDescription className="text-blue-700">
              {selectedIds.size} of {totalCount} {entityType} selected
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-blue-700 hover:text-blue-900"
          >
            Clear Selection
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[250px] bg-white">
              <SelectValue placeholder="Select action..." />
            </SelectTrigger>
            <SelectContent>
              {getAvailableActions().map((act) => (
                <SelectItem
                  key={act.value}
                  value={act.value}
                  className={act.destructive ? 'text-red-600' : ''}
                >
                  <div className="flex items-center gap-2">
                    {act.icon}
                    {act.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleBulkAction}
            disabled={!action || processing}
            className="min-w-[120px]"
          >
            {processing ? 'Processing...' : 'Apply Action'}
          </Button>

          {selectedIds.size > 10 && (
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              ⚠️ Large selection
            </Badge>
          )}
        </div>

        {action && (
          <div className="text-sm text-blue-700 bg-white p-3 rounded border border-blue-200">
            <strong>Preview:</strong> This will {action} {selectedIds.size} {entityType}.
            {action === 'delete' && ' This action cannot be undone!'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
