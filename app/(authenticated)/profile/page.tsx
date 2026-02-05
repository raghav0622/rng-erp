'use client';

import { RNGForm, createFormBuilder } from '@/rng-forms';
import { useAuthNotifications } from '@/rng-platform/rng-auth/app-auth-hooks';
import {
  useUpdateUserPhoto,
  useUpdateUserProfile,
} from '@/rng-platform/rng-auth/app-auth-hooks/useUserManagementMutations';
import { useCurrentUser } from '@/rng-platform/rng-auth/app-auth-hooks/useUserQueries';
import { Alert, Container, Stack } from '@mantine/core';
import { IconUser } from '@tabler/icons-react';
import { useState } from 'react';
import { z } from 'zod';

const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().optional(), // Read-only
  role: z.string().optional(), // Read-only
  photoUrl: z.any().optional(),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

const builder = createFormBuilder(editProfileSchema);
const formSchema = {
  items: [
    builder.text('email', { label: 'Email', readOnly: true, disabled: true }),
    builder.text('role', { label: 'Role', readOnly: true, disabled: true }),
    builder.text('name', { label: 'Full Name', required: true }),
    builder.imageUpload('photoUrl', { label: 'Profile Photo', allowMultiple: false }),
  ],
};

export default function ProfilePage() {
  const { data: currentUser } = useCurrentUser();
  const updatePhoto = useUpdateUserPhoto();
  const updateProfile = useUpdateUserProfile();
  const notifications = useAuthNotifications();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (values: EditProfileFormValues) => {
    setExternalErrors([]);
    setShowSuccess(false);

    try {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // Update name if changed
      if (values.name !== currentUser.name) {
        await updateProfile.mutateAsync({
          userId: currentUser.id,
          data: { name: values.name },
        });
      }

      // Update photo if changed
      const currentPhotoUrl = currentUser?.photoUrl || '';
      let nextPhoto = values.photoUrl;
      let shouldUpdatePhoto = false;

      if (typeof nextPhoto === 'string') {
        // Empty string means photo was removed - need to delete
        if (nextPhoto.trim().length === 0) {
          shouldUpdatePhoto = true;
          nextPhoto = undefined; // undefined signals deletion
        }
        // Photo URL unchanged - skip update
        else if (nextPhoto === currentPhotoUrl) {
          shouldUpdatePhoto = false;
        }
        // New URL (shouldn't happen, but handle it)
        else {
          shouldUpdatePhoto = true;
        }
      } else if (nextPhoto instanceof File) {
        // New file uploaded
        shouldUpdatePhoto = true;
      } else if (nextPhoto && typeof nextPhoto === 'object' && 'file' in nextPhoto) {
        // ImageValue object from form
        shouldUpdatePhoto = true;
      }

      if (shouldUpdatePhoto) {
        await updatePhoto.mutateAsync({
          userId: currentUser.id,
          photo: nextPhoto as File | string | undefined,
        });
      }

      setShowSuccess(true);
      notifications.showSuccess('Your profile has been updated successfully!', 'Profile Updated');
    } catch (error) {
      const appError = error as any;
      const errorMsg = appError?.message || 'Failed to update profile';
      setExternalErrors([errorMsg]);
      notifications.showError(errorMsg, 'Profile Update Failed');
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Container size="xs">
      <Stack>
        <Stack gap="xs" align="center">
          <div style={{ color: 'var(--mantine-color-blue-6)' }}>
            <IconUser size={24} />
          </div>
          <h3>Edit Profile</h3>
          <p
            style={{
              color: 'var(--mantine-color-dimmed)',
              fontSize: 'var(--mantine-font-size-sm)',
            }}
          >
            Update your profile information
          </p>
        </Stack>

        {showSuccess && (
          <Alert color="green" variant="light">
            Your profile has been updated successfully
          </Alert>
        )}

        {externalErrors.length > 0 && (
          <Alert color="red" variant="light">
            {externalErrors[0]}
          </Alert>
        )}

        <RNGForm
          schema={formSchema}
          validationSchema={editProfileSchema}
          defaultValues={{
            email: currentUser.email || '',
            role: currentUser.role || '',
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
          submitLabel={
            updatePhoto.isPending || updateProfile.isPending ? 'Updating...' : 'Update Profile'
          }
          showReset={false}
          requireChange={false}
        />
      </Stack>
    </Container>
  );
}
