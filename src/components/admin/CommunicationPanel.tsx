import { logger } from '@/lib/logger';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Megaphone, Send, Clock } from 'lucide-react';

export function CommunicationPanel() {
  const [targetAudience, setTargetAudience] = useState<'all_users' | 'all_partners' | 'everyone'>('all_users');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendAnnouncement = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    setSending(true);
    try {
      // Insert announcement record
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          subject,
          message,
          target_audience: targetAudience,
          priority,
          status: 'sent',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Call edge function to send emails and Telegram notifications
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-announcement', {
        body: { announcementId: data.id }
      });

      if (functionError) {
        logger.error('Error sending notifications:', functionError);
        toast.warning('Announcement saved but notifications may have failed');
      } else {
        const stats = functionData?.stats;
        toast.success(
          `Announcement sent to ${stats?.total_targets || 0} recipients!\n` +
          `📧 ${stats?.emails_sent || 0} emails, 💬 ${stats?.telegrams_sent || 0} Telegram messages`
        );
      }
      
      // Reset form
      setSubject('');
      setMessage('');
      setPriority('medium');
    } catch (error: any) {
      logger.error('Error sending announcement:', error);
      toast.error(error.message || 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Communication Panel</h2>
        <p className="text-muted-foreground">Broadcast messages to users and partners</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Send Announcement
          </CardTitle>
          <CardDescription>
            Broadcast a message to your selected audience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <RadioGroup value={targetAudience} onValueChange={(v: any) => setTargetAudience(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_users" id="all_users" />
                <Label htmlFor="all_users" className="cursor-pointer font-normal">
                  All Users (Customers)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_partners" id="all_partners" />
                <Label htmlFor="all_partners" className="cursor-pointer font-normal">
                  All Partners (Business Owners)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="everyone" id="everyone" />
                <Label htmlFor="everyone" className="cursor-pointer font-normal">
                  Everyone (Users + Partners)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority Level</Label>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Low</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter announcement subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your announcement message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>

          <Button 
            onClick={handleSendAnnouncement} 
            disabled={sending}
            className="w-full"
          >
            {sending ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Announcement
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
          <CardDescription>History of sent broadcasts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-8">
            Announcement history will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
