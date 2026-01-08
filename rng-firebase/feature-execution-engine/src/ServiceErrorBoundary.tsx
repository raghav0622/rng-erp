import { Component, ReactNode } from 'react';

type FallbackType = ReactNode | ((error: Error) => ReactNode);

interface Props {
  children: ReactNode;
  fallback: FallbackType;
}

interface State {
  error: Error | null;
}

export class ServiceErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // Do not swallow errors; preserve error identity for boundaries
    // Optionally, could rethrow or report here if required by contract
  }

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return (fallback as (error: Error) => ReactNode)(this.state.error);
      }
      return fallback;
    }
    return this.props.children;
  }
}
