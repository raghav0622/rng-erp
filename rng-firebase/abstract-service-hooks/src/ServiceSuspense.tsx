import { ReactNode, Suspense } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ServiceSuspense({ children, fallback }: Props) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
