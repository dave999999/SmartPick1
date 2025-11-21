import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

interface Announcement {
  id: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

export function AnnouncementPopup() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Get dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissed_announcements');
    if (dismissed) {
      setDismissedIds(new Set(JSON.parse(dismissed)));
    }

    // Subscribe to new announcements
    const channel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
        },
        (payload) => {
          const newAnnouncement = payload.new as Announcement;
          setAnnouncements((prev) => [...prev, newAnnouncement]);
          
          // Show toast notification
          toast.info(newAnnouncement.subject, {
            description: newAnnouncement.message,
            duration: 10000,
          });
        }
      )
      .subscribe();

    // Fetch recent announcements (last 24 hours)
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (data) {
        setAnnouncements(data);
      }
    };

    fetchRecent();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissed_announcements', JSON.stringify(Array.from(newDismissed)));
  };

  const visibleAnnouncements = announcements.filter((a) => !dismissedIds.has(a.id));

  if (visibleAnnouncements.length === 0) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      default: return '🟢';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-2">
      {visibleAnnouncements.map((announcement) => (
        <Card
          key={announcement.id}
          className={`border-2 shadow-lg ${getPriorityColor(announcement.priority)}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                <CardTitle className="text-lg">
                  {getPriorityIcon(announcement.priority)} {announcement.subject}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(announcement.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-gray-900 whitespace-pre-wrap">
              {announcement.message}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
