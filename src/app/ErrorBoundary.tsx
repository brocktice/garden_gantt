// src/app/ErrorBoundary.tsx
// Top-level error boundary per .planning/phases/01-foundation-schedule-engine/01-UI-SPEC.md §Copywriting §Error state
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Phase 4's polish phase will pipe to a logging service. Phase 1 logs to console.
    console.error('[ErrorBoundary]', error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="text-center py-16 px-4">
          <h1 className="text-3xl font-semibold text-stone-900">Something went wrong</h1>
          <p className="mt-4 text-base text-stone-600 max-w-prose mx-auto">
            {this.state.error.message || 'An unexpected error occurred.'} Refresh to try again.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
