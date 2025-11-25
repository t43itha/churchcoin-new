"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  section?: string; // For logging/tracking which section failed
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for graceful error handling.
 * Wraps sections to prevent entire app crashes from component errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service (future: Sentry, LogRocket, etc.)
    console.error(
      `[ErrorBoundary${this.props.section ? `: ${this.props.section}` : ""}]`,
      error,
      errorInfo
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-paper border border-ledger rounded-lg">
          <AlertTriangle className="h-12 w-12 text-error mb-4" />
          <h3 className="text-lg font-medium text-ink mb-2">
            Something went wrong
          </h3>
          <p className="text-grey-mid text-sm mb-4 text-center max-w-md">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <Button onClick={this.handleReset} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for easier use with hooks
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  section?: string
) {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  const ComponentWithErrorBoundary = (props: P) => {
    return (
      <ErrorBoundary section={section}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}
