'use client';

import { RNGForm, createFormBuilder } from '@/rng-forms';
import {
  changePasswordSchema,
  useChangePassword,
  useRequireAuthenticated,
  useUpdateUserPhoto,
  useUpdateUserProfile,
} from '@/rng-platform';
import { RNGModal, RNGPageContent, useRNGNotification } from '@/rng-ui/ux';
import { Alert, Button, Group, Stack } from '@mantine/core';
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
  const user = useRequireAuthenticated();
  const updatePhoto = useUpdateUserPhoto();
  const updateProfile = useUpdateUserProfile();
  const changePassword = useChangePassword();
  const notifications = useRNGNotification();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSubmit = async (values: EditProfileFormValues) => {
    setExternalErrors([]);
    setShowSuccess(false);

    try {
      if (values.name !== user.name) {
        await updateProfile.mutateAsync({
          userId: user.id,
          data: { name: values.name },
        });
      }

      // Update photo if changed
      const currentPhotoUrl = user?.photoUrl || '';
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
          userId: user.id,
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

  const handlePasswordSubmit = async (values: { currentPassword: string; newPassword: string }) => {
    setPasswordErrors([]);
    setPasswordSuccess(false);

    try {
      await changePassword.mutateAsync(values);
      setPasswordSuccess(true);
    } catch (error) {
      const appError = error as any;
      const errorMsg = appError?.message || 'Failed to update password';
      setPasswordErrors([errorMsg]);
    }
  };

  const resetPasswordState = () => {
    setPasswordErrors([]);
    setPasswordSuccess(false);
  };

  const warnings = [
    showSuccess ? (
      <Alert key="profile-success" color="green" variant="light">
        Your profile has been updated successfully.
      </Alert>
    ) : null,
    externalErrors.length > 0 ? (
      <Alert key="profile-error" color="red" variant="light">
        {externalErrors[0]}
      </Alert>
    ) : null,
  ].filter(Boolean);

  return (
    <RNGPageContent
      title="Profile"
      description="Update your profile information"
      actions={
        <RNGModal
          title="Change Password"
          size="sm"
          renderTrigger={({ onClick }) => (
            <Button
              variant="light"
              onClick={() => {
                resetPasswordState();
                onClick();
              }}
            >
              Change Password
            </Button>
          )}
        >
          {(onClose) => (
            <Stack gap="md">
              {passwordSuccess ? (
                <Stack gap="sm">
                  <Alert color="green" variant="light">
                    Your password has been updated successfully.
                  </Alert>
                  <Group justify="flex-end">
                    <Button variant="default" onClick={onClose}>
                      Close
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <RNGForm
                  schema={{
                    items: [
                      {
                        type: 'password',
                        name: 'currentPassword',
                        label: 'Current Password',
                        placeholder: 'Enter your current password',
                        required: true,
                      },
                      {
                        type: 'password',
                        name: 'newPassword',
                        label: 'New Password',
                        placeholder: 'Enter a strong password',
                        required: true,
                        description:
                          'Minimum 8 characters with uppercase, lowercase, number, and special character',
                      },
                    ],
                  }}
                  validationSchema={changePasswordSchema}
                  onSubmit={handlePasswordSubmit}
                  submitLabel={changePassword.isPending ? 'Changing...' : 'Change Password'}
                  showReset={false}
                  externalErrors={passwordErrors}
                  requireChange={false}
                />
              )}
            </Stack>
          )}
        </RNGModal>
      }
      warnings={warnings.length > 0 ? warnings : undefined}
    >
      <Stack gap="lg" p={0}>
        <RNGForm
          schema={formSchema}
          validationSchema={editProfileSchema}
          defaultValues={{
            email: user.email || '',
            role: user.role || '',
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
          submitLabel={
            updatePhoto.isPending || updateProfile.isPending ? 'Updating...' : 'Update Profile'
          }
          showReset={false}
          requireChange={false}
        />
      </Stack>
    </RNGPageContent>
  );
}
