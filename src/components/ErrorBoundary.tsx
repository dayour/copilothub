// ---------------------------------------------------------------------------
// ErrorBoundary.tsx -- Generic React error boundary with retry.
// Used to isolate crashes in embedded webview panels (Copilot Studio,
// Power Platform, etc.) so they cannot take down the rest of the workbench.
// ---------------------------------------------------------------------------

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Friendly label shown to the user when something crashes. */
  label?: string;
  /** Children rendered inside the boundary. */
  children: ReactNode;
  /** Optional callback when an error is caught. */
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  /** Optional reset key — when it changes the boundary resets. */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', this.props.label ?? '(unlabeled)', error, info);
    }
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const label = this.props.label ?? 'panel';
    const message = this.state.error?.message ?? 'Unknown error';

    return (
      <div
        role="alert"
        className="w-full h-full flex items-center justify-center p-6 bg-night text-cloud"
      >
        <div className="max-w-md w-full bg-ink/60 border border-slate/30 rounded-lg p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-2">The {label} crashed.</h2>
          <p className="text-sm text-slate mb-4 break-words">{message}</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-3 py-1.5 rounded bg-gradient-to-br from-[#7BA4D6] to-[#38C8FF] text-night font-medium text-sm hover:opacity-90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
