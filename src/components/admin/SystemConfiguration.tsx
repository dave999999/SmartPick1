import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  DollarSign, 
  Clock, 
  Shield, 
  Wrench, 
  Save, 
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface SettingGroup {
  [key: string]: number | boolean | string;
}

interface SystemSettings {
  points: SettingGroup;
  fees: SettingGroup;
  reservations: SettingGroup;
  features: SettingGroup;
  security: SettingGroup;
}

const DEFAULT_SETTINGS: SystemSettings = {
  points: {
    welcomePoints: 100,
    referralBonus: 50,
    minPointsToReserve: 10,
    pointsExpiryDays: 365,
  },
  fees: {
    partnerCommissionRate: 15,
    platformFee: 5,
    cancellationFee: 10,
  },
  reservations: {
    maxReservationsPerUser: 5,
    reservationExpiryHours: 24,
    minPickupTimeHours: 2,
  },
  features: {
    enableReferrals: true,
    enableAchievements: true,
    maintenanceMode: false,
  },
  security: {
    maxLoginAttempts: 5,
    sessionTimeoutMinutes: 60,
    enableRateLimiting: true,
  },
};

export default function SystemConfiguration() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminUserId(user.id);
      }
      
      // Load all settings from system_settings table (key-value store)
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');
      
      if (error) {
        logger.error('Error loading settings:', error);
        toast.error('Failed to load settings');
        setLoading(false);
        return;
      }
      
      // Convert key-value pairs to nested structure
      const loadedSettings: SystemSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      
      data?.forEach((setting: any) => {
        const key = setting.key;
        const value = setting.value;
        
        // Map keys to groups
        if (key.includes('points') || key.includes('Points') || key.includes('referral')) {
          const settingKey = key.charAt(0).toLowerCase() + key.slice(1);
          loadedSettings.points[settingKey] = value;
        } else if (key.includes('commission') || key.includes('fee') || key.includes('Fee')) {
          const settingKey = key.charAt(0).toLowerCase() + key.slice(1);
          loadedSettings.fees[settingKey] = value;
        } else if (key.includes('reservation') || key.includes('Reservation') || key.includes('pickup')) {
          const settingKey = key.charAt(0).toLowerCase() + key.slice(1);
          loadedSettings.reservations[settingKey] = value;
        } else if (key.includes('enable') || key === 'maintenanceMode') {
          const settingKey = key.charAt(0).toLowerCase() + key.slice(1);
          loadedSettings.features[settingKey] = value;
        } else if (key.includes('Login') || key.includes('session') || key.includes('timeout') || key.includes('RateLimit')) {
          const settingKey = key.charAt(0).toLowerCase() + key.slice(1);
          loadedSettings.security[settingKey] = value;
        }
      });
      
      setSettings(loadedSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(loadedSettings)));
      logger.info('Settings loaded successfully');
    } catch (error) {
      logger.error('Error loading settings:', error);
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!adminUserId) {
      toast.error('Admin user not found');
      return;
    }

    try {
      setSaving(true);
      
      // Collect all changed settings
      const changedSettings: Array<{ key: string; value: any }> = [];
      
      // Compare and collect changes
      Object.entries(settings).forEach(([group, groupSettings]) => {
        Object.entries(groupSettings).forEach(([key, value]) => {
          const originalGroup = originalSettings[group as keyof SystemSettings];
          const originalValue = originalGroup[key];
          
          if (value !== originalValue) {
            // Convert first letter to uppercase for key format
            const settingKey = key.charAt(0).toUpperCase() + key.slice(1);
            changedSettings.push({ key: settingKey, value });
          }
        });
      });

      if (changedSettings.length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }

      logger.info(`Saving ${changedSettings.length} settings...`);

      // Use the secure RPC function with audit logging
      for (const setting of changedSettings) {
        const { error } = await supabase.rpc('update_system_setting', {
          p_setting_key: setting.key,
          p_setting_value: setting.value,
          p_admin_user_id: adminUserId
        });

        if (error) {
          logger.error(`Error saving ${setting.key}:`, error);
          throw error;
        }
      }

      // Reload to get fresh data
      await loadSettings();
      
      toast.success(`Successfully saved ${changedSettings.length} setting(s)`);
      logger.info('All settings saved with audit trail');
    } catch (error) {
      logger.error('Error saving settings:', error);
      toast.error('Failed to save some settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  const updateSetting = (group: keyof SystemSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
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
            <Settings className="h-6 w-6 text-teal-600" />
            System Configuration
          </h2>
          <p className="text-muted-foreground mt-1">Configure platform-wide settings and behavior</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges() && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Unsaved changes
            </Badge>
          )}
          <Button onClick={loadSettings} variant="outline" disabled={saving} size="sm">
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges() || saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>


      <Tabs defaultValue="points" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-5 bg-gray-100">
          <TabsTrigger value="points" className="data-[state=active]:bg-white">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Points & Economy</span>
            <span className="sm:hidden">Points</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="data-[state=active]:bg-white">
            <Clock className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Reservations</span>
            <span className="sm:hidden">Time</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-white">
            <Wrench className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Features</span>
            <span className="sm:hidden">Features</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="data-[state=active]:bg-white">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Fees</span>
            <span className="sm:hidden">Fees</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white">
            <Shield className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Security</span>
            <span className="sm:hidden">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Points & Economy Tab */}
        <TabsContent value="points" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-teal-600" />
                Points System
              </CardTitle>
              <CardDescription>Configure point rewards and requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="welcomePoints" className="text-base">Welcome Bonus Points</Label>
                  <Input
                    id="welcomePoints"
                    type="number"
                    value={settings.points.welcomePoints}
                    onChange={(e) => updateSetting('points', 'welcomePoints', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Points new users receive on signup</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralBonus" className="text-base">Referral Bonus Points</Label>
                  <Input
                    id="referralBonus"
                    type="number"
                    value={settings.points.referralBonus}
                    onChange={(e) => updateSetting('points', 'referralBonus', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Points for successful referrals</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minPointsToReserve" className="text-base">Minimum Points to Reserve</Label>
                  <Input
                    id="minPointsToReserve"
                    type="number"
                    value={settings.points.minPointsToReserve}
                    onChange={(e) => updateSetting('points', 'minPointsToReserve', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Minimum balance required</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointsExpiryDays" className="text-base">Points Expiry (Days)</Label>
                  <Input
                    id="pointsExpiryDays"
                    type="number"
                    value={settings.points.pointsExpiryDays}
                    onChange={(e) => updateSetting('points', 'pointsExpiryDays', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Set to 0 or 365 to never expire</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reservations Tab */}
        <TabsContent value="reservations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-600" />
                Reservation Settings
              </CardTitle>
              <CardDescription>Configure reservation limits and timing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxReservationsPerUser" className="text-base">Max Reservations Per User</Label>
                  <Input
                    id="maxReservationsPerUser"
                    type="number"
                    value={settings.reservations.maxReservationsPerUser}
                    onChange={(e) => updateSetting('reservations', 'maxReservationsPerUser', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Active reservations limit</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reservationExpiryHours" className="text-base">Reservation Expiry (Hours)</Label>
                  <Input
                    id="reservationExpiryHours"
                    type="number"
                    value={settings.reservations.reservationExpiryHours}
                    onChange={(e) => updateSetting('reservations', 'reservationExpiryHours', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Auto-cancel after this time</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minPickupTimeHours" className="text-base">Min Pickup Time (Hours)</Label>
                  <Input
                    id="minPickupTimeHours"
                    type="number"
                    value={settings.reservations.minPickupTimeHours}
                    onChange={(e) => updateSetting('reservations', 'minPickupTimeHours', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Advance notice required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-teal-600" />
                Feature Toggles
              </CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Referral System</Label>
                    <p className="text-sm text-muted-foreground">Allow users to refer friends for bonus points</p>
                  </div>
                  <Switch
                    checked={settings.features.enableReferrals as boolean}
                    onCheckedChange={(checked) => updateSetting('features', 'enableReferrals', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Achievements</Label>
                    <p className="text-sm text-muted-foreground">Gamification system with badges and rewards</p>
                  </div>
                  <Switch
                    checked={settings.features.enableAchievements as boolean}
                    onCheckedChange={(checked) => updateSetting('features', 'enableAchievements', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-lg border border-orange-200 bg-orange-50">
                  <div className="space-y-0.5">
                    <Label className="text-base text-orange-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Maintenance Mode
                    </Label>
                    <p className="text-sm text-orange-700">Disable platform access for all non-admin users</p>
                  </div>
                  <Switch
                    checked={settings.features.maintenanceMode as boolean}
                    onCheckedChange={(checked) => updateSetting('features', 'maintenanceMode', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                Commission & Fees
              </CardTitle>
              <CardDescription>Platform revenue settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="partnerCommissionRate" className="text-base">Partner Commission (%)</Label>
                  <Input
                    id="partnerCommissionRate"
                    type="number"
                    step="0.1"
                    value={settings.fees.partnerCommissionRate}
                    onChange={(e) => updateSetting('fees', 'partnerCommissionRate', parseFloat(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Revenue share for partners</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platformFee" className="text-base">Platform Fee (%)</Label>
                  <Input
                    id="platformFee"
                    type="number"
                    step="0.1"
                    value={settings.fees.platformFee}
                    onChange={(e) => updateSetting('fees', 'platformFee', parseFloat(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Platform service fee</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellationFee" className="text-base">Cancellation Fee (₾)</Label>
                  <Input
                    id="cancellationFee"
                    type="number"
                    step="0.1"
                    value={settings.fees.cancellationFee}
                    onChange={(e) => updateSetting('fees', 'cancellationFee', parseFloat(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Fee charged for cancellations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" />
                Security & Limits
              </CardTitle>
              <CardDescription>Configure security and rate limiting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts" className="text-base">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Lock account after this many failed attempts</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeoutMinutes" className="text-base">Session Timeout (Minutes)</Label>
                  <Input
                    id="sessionTimeoutMinutes"
                    type="number"
                    value={settings.security.sessionTimeoutMinutes}
                    onChange={(e) => updateSetting('security', 'sessionTimeoutMinutes', parseInt(e.target.value) || 0)}
                    className="text-lg"
                  />
                  <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">Protect API endpoints from abuse</p>
                  </div>
                  <Switch
                    checked={settings.security.enableRateLimiting as boolean}
                    onCheckedChange={(checked) => updateSetting('security', 'enableRateLimiting', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Status Footer */}
      {hasChanges() && (
        <Card className="border-teal-300 bg-teal-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Changes detected. Remember to save your configuration!</span>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
