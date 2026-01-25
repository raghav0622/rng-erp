'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Component, ReactNode } from 'react';

// Error boundary for query consumers
export type QueryErrorBoundaryProps = {
  children: ReactNode;
  fallback?: (props: { error: any }) => ReactNode;
};

class QueryErrorBoundary extends Component<QueryErrorBoundaryProps, { error: any }> {
  constructor(props: QueryErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (fallback) {
        return fallback({ error: this.state.error });
      }
      return <div>Query error: {String(this.state.error?.message || this.state.error)}</div>;
    }
    return this.props.children;
  }
}

export interface RNGQueryProviderProps {
  children: ReactNode;
  errorFallback?: (error: any) => ReactNode;
}

export function RNGQueryProvider({ children, errorFallback }: RNGQueryProviderProps) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorBoundary fallback={errorFallback}>{children}</QueryErrorBoundary>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
