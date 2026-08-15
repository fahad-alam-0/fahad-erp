import { Component, ErrorInfo, ReactNode } from 'react';
import { handleAppError, UserFriendlyError } from '@/lib/error-handler';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: UserFriendlyError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorInfo: handleAppError(error),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error Boundary catch:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full border border-destructive/20 bg-card p-6 rounded-lg text-center shadow-lg space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">{this.state.errorInfo?.title || 'System Error'}</h2>
            <p className="text-sm text-muted-foreground">{this.state.errorInfo?.message}</p>
            {this.state.errorInfo?.devDetails && (
              <pre className="text-[10px] text-left p-3 rounded bg-muted/60 text-muted-foreground overflow-x-auto max-h-36 font-mono">
                {this.state.errorInfo.devDetails}
              </pre>
            )}
            <Button onClick={this.handleReload} variant="default" className="w-full">
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
