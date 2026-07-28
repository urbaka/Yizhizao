import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WebGLErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface WebGLErrorBoundaryState {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<
  WebGLErrorBoundaryProps,
  WebGLErrorBoundaryState
> {
  declare readonly props: Readonly<WebGLErrorBoundaryProps>;

  state: WebGLErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Animated gradient switched to its fallback.', error, info);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

interface WebGLFallbackProps {
  className?: string;
}

export function WebGLFallback({ className }: WebGLFallbackProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(242,0,137,0.9),transparent_34%),radial-gradient(circle_at_82%_80%,rgba(79,70,229,0.75),transparent_40%),linear-gradient(135deg,#0a001a_0%,#1a0b2e_52%,#090013_100%)]',
        className,
      )}
    />
  );
}
