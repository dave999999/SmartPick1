import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { captureException, captureMessage, addBreadcrumb } from '@/lib/sentry';
import { useState } from 'react';

/**
 * Sentry Test Page
 * Use this page to verify Sentry error monitoring is working correctly
 */
export default function SentryTest() {
  const [lastAction, setLastAction] = useState<string>('');

  const throwError = () => {
    setLastAction('Throwing test error...');
    addBreadcrumb('User clicked "Throw Error" button', 'user-action');
    throw new Error('This is your first Sentry error!');
  };

  const captureTestException = () => {
    setLastAction('Capturing test exception...');
    addBreadcrumb('User clicked "Capture Exception" button', 'user-action');
    try {
      const error = new Error('Test exception captured manually');
      captureException(error, {
        testContext: 'This is a test error from SmartPick',
        timestamp: new Date().toISOString()
      });
      setLastAction('✅ Exception captured and sent to Sentry');
    } catch (e) {
      setLastAction('❌ Failed to capture exception');
    }
  };

  const captureTestMessage = () => {
    setLastAction('Capturing test message...');
    addBreadcrumb('User clicked "Capture Message" button', 'user-action');
    captureMessage('Test message from SmartPick dashboard', 'info');
    setLastAction('✅ Message sent to Sentry');
  };

  const addTestBreadcrumb = () => {
    setLastAction('Adding breadcrumb...');
    addBreadcrumb('User navigated to Sentry test page', 'navigation', {
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    setLastAction('✅ Breadcrumb added (will appear with next error)');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          ← Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🔍 Sentry Error Monitoring Test</CardTitle>
          <CardDescription>
            Test Sentry integration and verify errors are being captured
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          {lastAction && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm font-medium">Last Action:</p>
              <p className="text-sm text-gray-600">{lastAction}</p>
            </div>
          )}

          {/* Test Buttons */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Test Error Throwing</h3>
              <p className="text-sm text-gray-600 mb-3">
                This will throw an actual error and should be caught by Sentry's error boundary.
              </p>
              <Button
                onClick={throwError}
                variant="destructive"
              >
                💥 Throw Error
              </Button>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Test Manual Exception Capture</h3>
              <p className="text-sm text-gray-600 mb-3">
                This captures an exception without breaking the app.
              </p>
              <Button
                onClick={captureTestException}
                variant="default"
              >
                📤 Capture Exception
              </Button>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Test Message Capture</h3>
              <p className="text-sm text-gray-600 mb-3">
                This sends a message to Sentry (not an error).
              </p>
              <Button
                onClick={captureTestMessage}
                variant="secondary"
              >
                💬 Capture Message
              </Button>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Test Breadcrumb</h3>
              <p className="text-sm text-gray-600 mb-3">
                Add a breadcrumb (will show up with the next error).
              </p>
              <Button
                onClick={addTestBreadcrumb}
                variant="outline"
              >
                🍞 Add Breadcrumb
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">How to Verify:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Click any of the test buttons above</li>
              <li>Go to your Sentry dashboard at <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">sentry.io</a></li>
              <li>Navigate to "Issues" in your project</li>
              <li>You should see the test error/message appear within a few seconds</li>
            </ol>
          </div>

          {/* Configuration Info */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Current Configuration:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>DSN Configured: {import.meta.env.VITE_SENTRY_DSN ? '✅ Yes' : '❌ No'}</p>
              <p>Environment: {import.meta.env.MODE}</p>
              <p>Hostname: {window.location.hostname}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
