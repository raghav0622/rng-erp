'use client';

import { Alert, Button, Group, Radio, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUpdateUserRole } from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import RoleBadge from '../components/RoleBadge';
import {
  ErrorAlert,
  ScreenContainer,
  ScreenHeader,
  SuccessMessage,
} from '../shared/ScreenComponents';

export interface UpdateUserRoleScreenProps {
  userId: string;
  onSuccess?: (user: AppUser) => void;
  backPath?: string;
}

/**
 * Update user role screen
 *
 * Features:
 * - View current user role
 * - Select new role (Owner, Manager, Employee, Client)
 * - Submit role change
 * - Shows confirmation
 * - Redirects to user detail after success
 *
 * Restrictions:
 * - Cannot change owner role
 * - Cannot remove owner status
 * - Requires manager+ role
 *
 * @example
 * <UpdateUserRoleScreen userId="user123" backPath="/users" />
 */
export function UpdateUserRoleScreen({
  userId,
  onSuccess,
  backPath = '/users',
}: UpdateUserRoleScreenProps) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useGetUserById(userId);
  const updateRole = useUpdateUserRole();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('');
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  if (userLoading) {
    return <AuthLoadingOverlay message="Loading user..." />;
  }

  if (!user) {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="User Not Found"
          description="The user you're trying to update could not be found."
        />
        <Button onClick={() => router.push(backPath)}>Back to Users</Button>
      </ScreenContainer>
    );
  }

  // Cannot change owner role
  if (user.role === 'owner') {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="Cannot Update Owner Role"
          description="Owner role cannot be changed. If you need to transfer ownership, contact support."
        />
        <Button onClick={() => router.push(backPath)}>Back</Button>
      </ScreenContainer>
    );
  }

  const handleSubmit = async (): Promise<void> => {
    if (!selectedRole) {
      setExternalErrors(['Please select a new role']);
      return;
    }

    if (selectedRole === user.role) {
      setExternalErrors(['Please select a different role']);
      return;
    }

    setExternalErrors([]);

    try {
      await updateRole.mutateAsync({
        userId,
        data: {
          role: selectedRole as 'owner' | 'manager' | 'employee' | 'client',
          ...(selectedRoleCategory && { roleCategory: selectedRoleCategory }),
        },
      });

      if (onSuccess && user) {
        onSuccess(user);
      }

      setShowSuccess(true);
      setTimeout(() => {
        router.push(`${backPath}/${userId}`);
      }, 2000);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to update user role']);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Update User Role"
        description={`Modify role for ${user.name}`}
        icon={IconCheck}
      />

      {showSuccess && (
        <SuccessMessage
          title="Role Updated"
          message={`Successfully updated user role to ${selectedRole}`}
          redirect={`${backPath}/${userId}`}
          delay={2000}
        />
      )}

      {externalErrors.length > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          <Stack gap="xs">
            {externalErrors.map((error, idx) => (
              <Text key={idx} size="sm">
                {error}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      <Stack gap="lg">
        <div>
          <Text fw={600} size="sm" mb="md">
            Current Role: <RoleBadge role={user.role} />
          </Text>
        </div>

        <Stack gap="md">
          <div>
            <Text fw={600} size="sm" mb="sm">
              Select New Role
            </Text>
            <Radio.Group value={selectedRole} onChange={setSelectedRole}>
              <Stack gap="sm">
                <Radio value="manager" label="Manager (Team management, user invites)" />
                <Radio value="employee" label="Employee (Can view team, limited actions)" />
                <Radio value="client" label="Client (Limited access, external)" />
              </Stack>
            </Radio.Group>
          </div>

          {selectedRole && (
            <div>
              <Text fw={600} size="sm" mb="sm">
                Role Category (Optional)
              </Text>
              <input
                type="text"
                placeholder="e.g., Sales, Engineering, Support"
                value={selectedRoleCategory}
                onChange={(e) => setSelectedRoleCategory(e.currentTarget.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--mantine-radius-sm)',
                  border: '1px solid var(--mantine-color-gray-3)',
                  fontFamily: 'inherit',
                }}
              />
              <Text size="xs" c="dimmed" mt="xs">
                Categorize the role for organizational structure (e.g., department, team type)
              </Text>
            </div>
          )}
        </Stack>

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => router.push(backPath)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={updateRole.isPending}
            disabled={!selectedRole || selectedRole === user.role}
          >
            Update Role
          </Button>
        </Group>
      </Stack>
    </ScreenContainer>
  );
}

export default UpdateUserRoleScreen;
