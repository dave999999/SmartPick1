import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ExternalLink, 
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react';

export default function ErrorMonitoring() {
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN;
  const sentryConfigured = !!sentryDSN;

  // Extract project info from DSN
  const projectInfo = sentryDSN ? extractProjectInfo(sentryDSN) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Error Monitoring</h2>
        <p className="text-gray-600">
          Real-time error tracking and performance monitoring with Sentry
        </p>
      </div>

      {!sentryConfigured ? (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Sentry not configured.</strong> Add your Sentry DSN to <code className="px-2 py-1 bg-yellow-100 rounded">.env.local</code>:
            <pre className="mt-2 p-3 bg-yellow-100 rounded overflow-x-auto">
              VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
            </pre>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Sentry is active!</strong> All errors are being tracked.
            {projectInfo && (
              <div className="mt-2">
                <span className="text-sm">
                  Project: <Badge variant="outline" className="ml-1">{projectInfo.projectId}</Badge>
                </span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {sentryConfigured ? (
                <>
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-sm">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">Active</span>
                </>
              ) : (
                <>
                  <div className="p-2 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg shadow-sm">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">Inactive</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-sm">
                <Info className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {import.meta.env.MODE}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sample Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {import.meta.env.MODE === 'production' ? '10%' : '100%'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Session Replay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-sm">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {sentryConfigured ? 'ON' : 'OFF'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-sm">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              Error Tracking
            </CardTitle>
            <CardDescription>
              Automatic capture of JavaScript errors and exceptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>All unhandled errors captured automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Full stack traces with source maps</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>User context (ID, email, browser)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Breadcrumbs of user actions before error</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-sm">
                <Clock className="w-4 h-4 text-white" />
              </div>
              Performance Monitoring
            </CardTitle>
            <CardDescription>
              Track application performance and slow transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Page load times and rendering metrics</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>API call performance tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Database query performance</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Real user monitoring (RUM)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg shadow-sm">
                <Users className="w-4 h-4 text-white" />
              </div>
              Session Replay
            </CardTitle>
            <CardDescription>
              Watch video-like recordings of user sessions with errors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Replay sessions that encountered errors</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>See exact user actions before crash</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>Privacy-safe: All text/media masked</span>
              </li>
              <li className="flex items-start gap-2">
                <Info className="w-4 h-4 text-gray-600 mt-0.5" />
                <span>10% of normal sessions, 100% with errors</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg shadow-sm">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              Alerts & Notifications
            </CardTitle>
            <CardDescription>
              Get notified when critical errors occur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Email alerts for new errors</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Slack/Discord webhook integrations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Custom alert rules and thresholds</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Error grouping and deduplication</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      {!sentryConfigured && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-blue-900">
            <div>
              <h4 className="font-semibold mb-2">1. Create Sentry Account (Free)</h4>
              <p className="text-sm mb-2">Sign up at <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="underline">sentry.io</a></p>
              <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                <li>Free tier: 5,000 errors/month</li>
                <li>No credit card required</li>
                <li>Perfect for startups</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Create React Project</h4>
              <p className="text-sm">In Sentry dashboard, create a new project and select "React"</p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Copy Your DSN</h4>
              <p className="text-sm mb-2">You'll see a DSN like:</p>
              <pre className="p-3 bg-blue-100 rounded text-xs overflow-x-auto">
                https://abc123...@o123456.ingest.us.sentry.io/456789
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">4. Add to Environment</h4>
              <p className="text-sm mb-2">Create/edit <code className="px-2 py-1 bg-blue-100 rounded">.env.local</code>:</p>
              <pre className="p-3 bg-blue-100 rounded text-xs overflow-x-auto">
                VITE_SENTRY_DSN=your-dsn-here
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">5. Restart Dev Server</h4>
              <pre className="p-3 bg-blue-100 rounded text-xs">
                pnpm dev
              </pre>
            </div>

            <Alert className="border-yellow-200 bg-yellow-100">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-sm">
                <strong>Note:</strong> The DSN is safe to commit to git (it's public). Keep your Auth Token private.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      {sentryConfigured && projectInfo && (
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Access your Sentry dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => window.open(`https://sentry.io/organizations/${projectInfo.orgSlug}/issues/`, '_blank')}
              >
                <AlertCircle className="w-4 h-4" />
                View Errors
                <ExternalLink className="w-3 h-3" />
              </Button>

              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => window.open(`https://sentry.io/organizations/${projectInfo.orgSlug}/performance/`, '_blank')}
              >
                <Clock className="w-4 h-4" />
                Performance
                <ExternalLink className="w-3 h-3" />
              </Button>

              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => window.open(`https://sentry.io/organizations/${projectInfo.orgSlug}/replays/`, '_blank')}
              >
                <Users className="w-4 h-4" />
                Session Replays
                <ExternalLink className="w-3 h-3" />
              </Button>

              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => window.open(`https://sentry.io/settings/${projectInfo.orgSlug}/projects/${projectInfo.projectSlug}/`, '_blank')}
              >
                <Info className="w-4 h-4" />
                Project Settings
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper to extract project info from DSN
function extractProjectInfo(dsn: string): { projectId: string; orgSlug: string; projectSlug: string } | null {
  try {
    // DSN format: https://key@o{orgId}.ingest.sentry.io/{projectId}
    // or: https://key@{orgSlug}.ingest.sentry.io/{projectId}
    const match = dsn.match(/https:\/\/[^@]+@([^.]+)\.ingest\..*\.sentry\.io\/(\d+)/);
    if (match) {
      const orgSlug = match[1];
      const projectId = match[2];
      return {
        projectId,
        orgSlug,
        projectSlug: `project-${projectId}` // Fallback, real slug may differ
      };
    }
    return null;
  } catch {
    return null;
  }
}
