import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, DollarSign, Mail, Flag, Wrench, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SystemConfig {
  // Points & Economy
  welcomePoints: number;
  referralBonus: number;
  minPointsToReserve: number;
  pointsExpiryDays: number;
  
  // Commission & Fees
  partnerCommissionRate: number;
  platformFee: number;
  cancellationFee: number;
  
  // Reservations
  maxReservationsPerUser: number;
  reservationExpiryHours: number;
  minPickupTimeHours: number;
  
  // Partner Settings
  autoApprovePartners: boolean;
  requirePartnerVerification: boolean;
  minPartnerRating: number;
  
  // Features
  enableReferrals: boolean;
  enableAchievements: boolean;
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  maintenanceMode: boolean;
  
  // Email Templates
  welcomeEmailSubject: string;
  welcomeEmailBody: string;
  partnerApprovalEmailSubject: string;
  partnerApprovalEmailBody: string;
  
  // Limits & Security
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  enableCaptcha: boolean;
  enableRateLimiting: boolean;
}

const defaultConfig: SystemConfig = {
  welcomePoints: 100,
  referralBonus: 50,
  minPointsToReserve: 10,
  pointsExpiryDays: 365,
  
  partnerCommissionRate: 15,
  platformFee: 5,
  cancellationFee: 10,
  
  maxReservationsPerUser: 5,
  reservationExpiryHours: 24,
  minPickupTimeHours: 2,
  
  autoApprovePartners: false,
  requirePartnerVerification: true,
  minPartnerRating: 3.0,
  
  enableReferrals: true,
  enableAchievements: true,
  enablePushNotifications: true,
  enableEmailNotifications: true,
  maintenanceMode: false,
  
  welcomeEmailSubject: 'Welcome to SmartPick!',
  welcomeEmailBody: 'Thank you for joining SmartPick. Start reserving surplus food today!',
  partnerApprovalEmailSubject: 'Your Partner Application has been Approved',
  partnerApprovalEmailBody: 'Congratulations! You can now start adding offers.',
  
  maxLoginAttempts: 5,
  sessionTimeoutMinutes: 60,
  enableCaptcha: true,
  enableRateLimiting: true,
};

export default function SystemConfiguration() {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      // Try to load from database (system_config table)
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .single();
      
      if (data && !error) {
        setConfig({ ...defaultConfig, ...data });
        toast.success('Configuration loaded');
      } else {
        // Use defaults
        setConfig(defaultConfig);
        toast.info('Using default configuration');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Failed to load configuration');
      setConfig(defaultConfig);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Upsert configuration to database
      const { error } = await supabase
        .from('system_config')
        .upsert({
          id: 1,
          ...config,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      toast.success('Configuration saved successfully!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration. You may need to create the system_config table.');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<SystemConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            System Configuration
          </h2>
          <p className="text-muted-foreground">Configure platform-wide settings and behavior</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-orange-600 font-medium">● Unsaved changes</span>
          )}
          <Button onClick={loadConfig} variant="outline" disabled={saving}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {config.maintenanceMode && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Maintenance Mode Enabled
            </CardTitle>
            <CardDescription className="text-orange-700">
              The platform is currently in maintenance mode. Only admins can access the system.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="points" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="points">
            <DollarSign className="h-4 w-4 mr-2" />
            Points & Economy
          </TabsTrigger>
          <TabsTrigger value="reservations">
            <Settings className="h-4 w-4 mr-2" />
            Reservations
          </TabsTrigger>
          <TabsTrigger value="features">
            <Flag className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="security">
            <Wrench className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Points System</CardTitle>
              <CardDescription>Configure point rewards and requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Welcome Bonus Points</Label>
                  <Input
                    type="number"
                    value={config.welcomePoints}
                    onChange={(e) => updateConfig({ welcomePoints: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Points new users receive on signup</p>
                </div>

                <div className="space-y-2">
                  <Label>Referral Bonus Points</Label>
                  <Input
                    type="number"
                    value={config.referralBonus}
                    onChange={(e) => updateConfig({ referralBonus: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Points for successful referrals</p>
                </div>

                <div className="space-y-2">
                  <Label>Minimum Points to Reserve</Label>
                  <Input
                    type="number"
                    value={config.minPointsToReserve}
                    onChange={(e) => updateConfig({ minPointsToReserve: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Minimum balance required</p>
                </div>

                <div className="space-y-2">
                  <Label>Points Expiry (Days)</Label>
                  <Input
                    type="number"
                    value={config.pointsExpiryDays}
                    onChange={(e) => updateConfig({ pointsExpiryDays: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">0 = never expire</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commission & Fees</CardTitle>
              <CardDescription>Platform revenue settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Partner Commission (%)</Label>
                  <Input
                    type="number"
                    value={config.partnerCommissionRate}
                    onChange={(e) => updateConfig({ partnerCommissionRate: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Platform Fee (%)</Label>
                  <Input
                    type="number"
                    value={config.platformFee}
                    onChange={(e) => updateConfig({ platformFee: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cancellation Fee (₾)</Label>
                  <Input
                    type="number"
                    value={config.cancellationFee}
                    onChange={(e) => updateConfig({ cancellationFee: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reservation Settings</CardTitle>
              <CardDescription>Configure reservation limits and timing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Max Reservations Per User</Label>
                  <Input
                    type="number"
                    value={config.maxReservationsPerUser}
                    onChange={(e) => updateConfig({ maxReservationsPerUser: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Active reservations limit</p>
                </div>

                <div className="space-y-2">
                  <Label>Reservation Expiry (Hours)</Label>
                  <Input
                    type="number"
                    value={config.reservationExpiryHours}
                    onChange={(e) => updateConfig({ reservationExpiryHours: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Auto-cancel after this time</p>
                </div>

                <div className="space-y-2">
                  <Label>Min Pickup Time (Hours)</Label>
                  <Input
                    type="number"
                    value={config.minPickupTimeHours}
                    onChange={(e) => updateConfig({ minPickupTimeHours: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Advance notice required</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Partner Settings</CardTitle>
              <CardDescription>Partner approval and requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Approve Partners</Label>
                    <p className="text-xs text-muted-foreground">Skip manual approval process</p>
                  </div>
                  <Switch
                    checked={config.autoApprovePartners}
                    onCheckedChange={(checked) => updateConfig({ autoApprovePartners: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Verification</Label>
                    <p className="text-xs text-muted-foreground">Partners must verify their business</p>
                  </div>
                  <Switch
                    checked={config.requirePartnerVerification}
                    onCheckedChange={(checked) => updateConfig({ requirePartnerVerification: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Minimum Partner Rating</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={config.minPartnerRating}
                    onChange={(e) => updateConfig({ minPartnerRating: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Partners below this rating may be flagged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Referral System</Label>
                  <p className="text-xs text-muted-foreground">Allow users to refer friends</p>
                </div>
                <Switch
                  checked={config.enableReferrals}
                  onCheckedChange={(checked) => updateConfig({ enableReferrals: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Achievements</Label>
                  <p className="text-xs text-muted-foreground">Gamification and badges</p>
                </div>
                <Switch
                  checked={config.enableAchievements}
                  onCheckedChange={(checked) => updateConfig({ enableAchievements: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Browser push notifications</p>
                </div>
                <Switch
                  checked={config.enablePushNotifications}
                  onCheckedChange={(checked) => updateConfig({ enablePushNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Send transactional emails</p>
                </div>
                <Switch
                  checked={config.enableEmailNotifications}
                  onCheckedChange={(checked) => updateConfig({ enableEmailNotifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label className="text-orange-600">Maintenance Mode</Label>
                  <p className="text-xs text-muted-foreground">Disable platform for non-admins</p>
                </div>
                <Switch
                  checked={config.maintenanceMode}
                  onCheckedChange={(checked) => updateConfig({ maintenanceMode: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Email</CardTitle>
              <CardDescription>Email sent to new users after signup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={config.welcomeEmailSubject}
                  onChange={(e) => updateConfig({ welcomeEmailSubject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  rows={4}
                  value={config.welcomeEmailBody}
                  onChange={(e) => updateConfig({ welcomeEmailBody: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Partner Approval Email</CardTitle>
              <CardDescription>Email sent when partner is approved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={config.partnerApprovalEmailSubject}
                  onChange={(e) => updateConfig({ partnerApprovalEmailSubject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  rows={4}
                  value={config.partnerApprovalEmailBody}
                  onChange={(e) => updateConfig({ partnerApprovalEmailBody: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Authentication and rate limiting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={config.maxLoginAttempts}
                    onChange={(e) => updateConfig({ maxLoginAttempts: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Before temporary lockout</p>
                </div>

                <div className="space-y-2">
                  <Label>Session Timeout (Minutes)</Label>
                  <Input
                    type="number"
                    value={config.sessionTimeoutMinutes}
                    onChange={(e) => updateConfig({ sessionTimeoutMinutes: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">Inactivity timeout</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable CAPTCHA</Label>
                    <p className="text-xs text-muted-foreground">Require CAPTCHA on signup/login</p>
                  </div>
                  <Switch
                    checked={config.enableCaptcha}
                    onCheckedChange={(checked) => updateConfig({ enableCaptcha: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Rate Limiting</Label>
                    <p className="text-xs text-muted-foreground">Prevent API abuse</p>
                  </div>
                  <Switch
                    checked={config.enableRateLimiting}
                    onCheckedChange={(checked) => updateConfig({ enableRateLimiting: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
