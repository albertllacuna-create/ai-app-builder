import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 font-mono text-sm overflow-auto">
          <h2 className="font-bold mb-2">Something went wrong</h2>
          <pre>{this.state.error?.message}</pre>
          <pre className="text-xs mt-2 opacity-70">{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
