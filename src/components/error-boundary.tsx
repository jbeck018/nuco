'use client';

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error Boundary component to catch errors in the component tree
 * and display a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI
      return this.props.fallback;
    }

    return this.props.children;
  }
} 