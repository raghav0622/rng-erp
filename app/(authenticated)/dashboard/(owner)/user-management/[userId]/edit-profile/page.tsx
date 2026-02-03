'use client';

import { UpdateUserProfileScreen } from '@/rng-platform/rng-auth/app-auth-components/screens/UpdateUserProfileScreen';
import { use } from 'react';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function EditUserProfilePage({ params }: PageProps) {
  const { userId } = use(params);
  return <UpdateUserProfileScreen userId={userId} backPath="/dashboard/user-management" />;
}
