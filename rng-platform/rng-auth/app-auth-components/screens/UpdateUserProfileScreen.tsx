'use client';

import { RNGForm, createFormBuilder } from '@/rng-forms';
import { Button, Loader } from '@mantine/core';
import { IconPencil } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { useUpdateUserProfile } from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import {
  ErrorAlert,
  ScreenContainer,
  ScreenHeader,
  SuccessMessage,
} from '../shared/ScreenComponents';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  photoUrl: z.string().optional(),
  roleCategory: z.string().optional(),
});

type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

const builder = createFormBuilder(updateProfileSchema);
const formSchema = {
  items: [
    builder.text('name', { label: 'Full Name', required: true }),
    builder.text('photoUrl', { label: 'Photo URL', placeholder: 'https://...' }),
    builder.text('roleCategory', {
      label: 'Role Category (Optional)',
      placeholder: 'e.g., Sales, Engineering',
    }),
  ],
};

export interface UpdateUserProfileScreenProps {
  backPath?: string;
}

/**
 * Update user profile screen
 *
 * Features:
 * - Administrators update other user profiles
 * - Edit name, email, photo URL
 * - Real-time validation
 * - Success confirmation
 * - Automatic redirect on success
 * - Error recovery
 *
 * Authorization:
 * Requires: RequireRole allow={['owner', 'manager']}
 * - Owner can edit any user profile
 * - Manager can edit employee/client profiles (future implementation)
 * - Cannot edit owner profiles (except owner editing self)
 *
 * @example
 * <RequireRole allow={['owner', 'manager']}>
 *   <UpdateUserProfileScreen backPath="/users" />
 * </RequireRole>
 */
export function UpdateUserProfileScreen({ backPath = '/users' }: UpdateUserProfileScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const { data: user, isLoading: userLoading } = useGetUserById(userId || '');
  const updateProfile = useUpdateUserProfile();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!userId) {
    return (
      <ScreenContainer>
        <ErrorAlert title="User Not Found" description="No user ID provided in URL" />
        <Button variant="subtle" mt="lg" onClick={() => router.push(backPath)}>
          Back
        </Button>
      </ScreenContainer>
    );
  }

  if (userLoading) {
    return <Loader />;
  }

  if (!user) {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="User Not Found"
          description="This user does not exist or has been deleted"
        />
        <Button variant="subtle" mt="lg" onClick={() => router.push(backPath)}>
          Back
        </Button>
      </ScreenContainer>
    );
  }

  const handleSubmit = async (values: UpdateProfileFormValues) => {
    setExternalErrors([]);
    setShowSuccess(false);

    try {
      await updateProfile.mutateAsync({
        userId,
        data: {
          name: values.name,
          photoUrl: values.photoUrl || undefined,
          ...(values.roleCategory && { roleCategory: values.roleCategory }),
        },
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push(backPath);
      }, 1500);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to update profile']);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Edit User Profile"
        description={`Update profile information for ${user.name}`}
        icon={IconPencil}
      />

      {showSuccess && (
        <SuccessMessage
          title="Success"
          message={`${user.name}'s profile has been updated successfully`}
        />
      )}

      {externalErrors.length > 0 && (
        <ErrorAlert title="Update Failed" description={externalErrors[0]} />
      )}

      <RNGForm<UpdateProfileFormValues>
        schema={formSchema}
        validationSchema={updateProfileSchema}
        defaultValues={{
          name: user.name || '',
          photoUrl: user.photoUrl || '',
        }}
        onSubmit={handleSubmit}
        onError={(errors: Record<string, any>) => {
          const errorMessages = Object.entries(errors)
            .map(([_, error]: any) => error?.message || 'Validation error')
            .filter(Boolean);
          if (errorMessages.length > 0) {
            setExternalErrors(errorMessages);
          }
        }}
        submitLabel={updateProfile.isPending ? 'Updating...' : 'Update Profile'}
        showReset={false}
      />

      <Button
        variant="subtle"
        mt="lg"
        onClick={() => router.push(backPath)}
        disabled={updateProfile.isPending}
      >
        Cancel
      </Button>
    </ScreenContainer>
  );
}

export default UpdateUserProfileScreen;
