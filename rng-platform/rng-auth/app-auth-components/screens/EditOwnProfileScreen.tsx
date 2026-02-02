'use client';

import { RNGForm, createFormBuilder } from '@/rng-forms';
import { Button } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { useUpdateOwnerProfile } from '../../app-auth-hooks/useUserManagementMutations';
import { useCurrentUser } from '../../app-auth-hooks/useUserQueries';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import {
  ErrorAlert,
  ScreenContainer,
  ScreenHeader,
  SuccessMessage,
} from '../shared/ScreenComponents';

const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  photoUrl: z.string().optional(),
  roleCategory: z.string().optional(),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

const builder = createFormBuilder(editProfileSchema);
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

export interface EditOwnProfileScreenProps {
  backPath?: string;
}

/**
 * Edit own profile screen
 *
 * Features:
 * - Users edit their own profile (name, photo URL)
 * - Real-time form validation
 * - Success confirmation
 * - Automatic redirect on success
 * - Error recovery
 *
 * Authorization:
 * - Requires RequireAuthenticated (any authenticated user)
 * - Can only edit own profile
 * - Not needed in a guard - screen operates on current user
 *
 * @example
 * <EditOwnProfileScreen backPath="/profile" />
 */
export function EditOwnProfileScreen({ backPath = '/profile' }: EditOwnProfileScreenProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const updateProfile = useUpdateOwnerProfile();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!currentUser) {
    return <AuthLoadingOverlay message="Loading profile..." />;
  }

  const handleSubmit = async (values: EditProfileFormValues) => {
    setExternalErrors([]);
    setShowSuccess(false);

    try {
      await updateProfile.mutateAsync({
        name: values.name,
        photoUrl: values.photoUrl || undefined,
        ...(values.roleCategory && { roleCategory: values.roleCategory }),
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
        title="Edit Profile"
        description="Update your profile information"
        icon={IconUser}
      />

      {showSuccess && (
        <SuccessMessage title="Success" message="Your profile has been updated successfully" />
      )}

      {externalErrors.length > 0 && (
        <ErrorAlert title="Update Failed" description={externalErrors[0]} />
      )}

      <RNGForm<EditProfileFormValues>
        schema={formSchema}
        validationSchema={editProfileSchema}
        defaultValues={{
          name: currentUser.name || '',
          photoUrl: currentUser.photoUrl || '',
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

export default EditOwnProfileScreen;
