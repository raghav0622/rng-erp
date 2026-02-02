import { redirect } from 'next/navigation';

export default function RootPage() {
  //no unauthenticated or public routes.

  return redirect('/dashboard');
}
