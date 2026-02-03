'use client';

import { UpdateUserRoleScreen } from '@/rng-platform/rng-auth/app-auth-components/screens/UpdateUserRoleScreen';
import { use } from 'react';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function EditUserRolePage({ params }: PageProps) {
  const { userId } = use(params);
  return <UpdateUserRoleScreen userId={userId} backPath="/dashboard/user-management" />;
}
