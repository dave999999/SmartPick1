import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, Database, Key, FolderOpen, Zap, RefreshCw } from 'lucide-react';

type HealthCheck = {
  status: 'healthy' | 'unhealthy' | 'error' | 'unknown';
  latency_ms?: number;
  error?: string;
  [key: string]: any;
};

type HealthState = {
  ok: boolean;
  status: string;
  latency_ms?: number;
  timestamp?: string;
  version?: string;
  checks?: {
    database?: HealthCheck;
    auth?: HealthCheck;
    storage?: HealthCheck;
    functions?: HealthCheck;
  };
  error?: string;
};

export default function AdminHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthState | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('health-check');
      if (error) throw error;
      setHealth((data as HealthState) || null);
    } catch (err) {
      setHealth({ 
        ok: false, 
        status: 'error',
        error: String(err),
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'unhealthy':
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Health Check</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor application and service status</p>
        </div>
        <Button 
          onClick={load} 
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-gray-500">Running health checks...</p>
          </div>
        </div>
      ) : !health ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="h-6 w-6" />
              <div>
                <p className="font-semibold">No health data available</p>
                <p className="text-sm text-red-600">Unable to fetch system status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall Status Card */}
          <Card className={`border-2 ${getStatusColor(health.status)}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(health.status)}
                  <div>
                    <CardTitle className="text-xl">
                      System Status: <span className="capitalize">{health.status || 'Unknown'}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {health.timestamp && `Last checked: ${new Date(health.timestamp).toLocaleString()}`}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(health.status)}>
                  {health.ok ? 'OPERATIONAL' : 'ISSUES DETECTED'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-sm text-gray-500">Response Time</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {health.latency_ms || 0}ms
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-sm text-gray-500">Version</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {health.version || 'N/A'}
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-sm text-gray-500">Services</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {health.checks ? Object.keys(health.checks).length : 0}
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-sm text-gray-500">Healthy</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    {health.checks ? Object.values(health.checks).filter(c => c.status === 'healthy').length : 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Checks */}
          {health.checks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Database Check */}
              <Card className={`border ${health.checks.database?.status === 'healthy' ? 'border-green-200' : 'border-red-200'}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${health.checks.database?.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Database className={`h-5 w-5 ${health.checks.database?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Database</CardTitle>
                      <CardDescription className="capitalize">{health.checks.database?.status}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(health.checks.database?.status)}>
                      {health.checks.database?.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {health.checks.database?.latency_ms !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Latency:</span>
                        <span className="font-medium">{health.checks.database.latency_ms}ms</span>
                      </div>
                    )}
                    {health.checks.database?.records !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Connection:</span>
                        <span className="font-medium">Active</span>
                      </div>
                    )}
                    {health.checks.database?.error && (
                      <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                        {health.checks.database.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Auth Check */}
              <Card className={`border ${health.checks.auth?.status === 'healthy' ? 'border-green-200' : 'border-red-200'}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${health.checks.auth?.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Key className={`h-5 w-5 ${health.checks.auth?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Authentication</CardTitle>
                      <CardDescription className="capitalize">{health.checks.auth?.status}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(health.checks.auth?.status)}>
                      {health.checks.auth?.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {health.checks.auth?.user_count !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Service:</span>
                        <span className="font-medium">Operational</span>
                      </div>
                    )}
                    {health.checks.auth?.error && (
                      <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                        {health.checks.auth.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Storage Check */}
              <Card className={`border ${health.checks.storage?.status === 'healthy' ? 'border-green-200' : 'border-red-200'}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${health.checks.storage?.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <FolderOpen className={`h-5 w-5 ${health.checks.storage?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Storage</CardTitle>
                      <CardDescription className="capitalize">{health.checks.storage?.status}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(health.checks.storage?.status)}>
                      {health.checks.storage?.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {health.checks.storage?.buckets !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Buckets:</span>
                        <span className="font-medium">{health.checks.storage.buckets}</span>
                      </div>
                    )}
                    {health.checks.storage?.error && (
                      <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                        {health.checks.storage.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Functions Check */}
              <Card className={`border ${health.checks.functions?.status === 'healthy' ? 'border-green-200' : 'border-red-200'}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${health.checks.functions?.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Zap className={`h-5 w-5 ${health.checks.functions?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Edge Functions</CardTitle>
                      <CardDescription className="capitalize">{health.checks.functions?.status}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(health.checks.functions?.status)}>
                      {health.checks.functions?.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className="font-medium">Responding</span>
                    </div>
                    {health.checks.functions?.error && (
                      <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                        {health.checks.functions.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error Display */}
          {health.error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  System Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700 font-mono">{health.error}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}


