import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="min-h-screen bg-gradient-to-b from-white via-[#EFFFF8] to-[#C9F9E9] flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
              </div>
              <CardDescription className="text-base">
                We encountered an unexpected error. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* User-friendly error message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-1">What happened?</p>
                <p className="text-sm text-red-700">
                  The application encountered an error while processing your request. This has been
                  logged and our team will investigate.
                </p>
              </div>

              {/* What users can do */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">What you can do:</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Try refreshing the page</li>
                  <li>Go back to the homepage</li>
                  <li>Clear your browser cache if the problem persists</li>
                  <li>Contact support if you continue to see this error</li>
                </ul>
              </div>

              {/* Technical details (development only) */}
              {isDevelopment && this.state.error && (
                <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <summary className="text-sm font-medium text-gray-800 cursor-pointer hover:text-gray-600">
                    🔧 Technical Details (Development Only)
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Error Message:</p>
                      <pre className="text-xs bg-red-100 p-2 rounded overflow-x-auto">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Stack Trace:</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Component Stack:</p>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReload}
                className="flex-1 bg-gradient-to-r from-[#00C896] to-[#009B77] hover:from-[#00B588] hover:to-[#008866]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

