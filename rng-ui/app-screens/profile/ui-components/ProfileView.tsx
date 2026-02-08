'use client';

import { RNGForm, createFormBuilder } from '@/rng-forms';
import type { AppUser } from '@/rng-platform';
import { RNGMessageAlert, RNGModal, RNGPageContent } from '@/rng-ui/ux';
import { Button, Group, Stack } from '@mantine/core';
import { z, type ZodTypeAny } from 'zod';

const editProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().optional(),
  role: z.string().optional(),
  photoUrl: z.any().optional(),
});

const builder = createFormBuilder(editProfileSchema);
const formSchema = {
  items: [
    // Account Information Section (read-only)
    builder.text('email', {
      label: 'Email',
      readOnly: true,
      colProps: { span: { base: 12, sm: 6 } },
    }),
    builder.text('role', {
      label: 'Role',
      readOnly: true,
      colProps: { span: { base: 12, sm: 6 } },
    }),
    // Editable Section
    builder.text('name', {
      label: 'Full Name',
      required: true,
      placeholder: 'Enter your full name',
      colProps: { span: { base: 12 } },
    }),
    builder.imageUpload('photoUrl', {
      label: 'Profile Photo',
      allowMultiple: false,
      description: 'Upload a professional profile picture (JPG, PNG)',
      colProps: { span: { base: 12 } },
    }),
  ],
};

export interface ProfileViewProps {
  user: AppUser;
  externalErrors: string[];
  showSuccess: boolean;
  passwordErrors: string[];
  passwordSuccess: boolean;
  isUpdatingProfile: boolean;
  isChangingPassword: boolean;
  onSubmit: (values: any) => Promise<void>;
  onPasswordSubmit: (values: any) => Promise<void>;
  onFormError: (errors: Record<string, any>) => void;
  onResetPasswordState: () => void;
  changePasswordSchema: ZodTypeAny;
}

export function ProfileView({
  user,
  externalErrors,
  showSuccess,
  passwordErrors,
  passwordSuccess,
  isUpdatingProfile,
  isChangingPassword,
  onSubmit,
  onPasswordSubmit,
  onFormError,
  onResetPasswordState,
  changePasswordSchema,
}: ProfileViewProps) {
  const warnings = [
    showSuccess ? (
      <RNGMessageAlert
        key="profile-success"
        tone="green"
        message="Your profile has been updated successfully."
      />
    ) : null,
    externalErrors.length > 0 ? (
      <RNGMessageAlert key="profile-error" tone="red" message={externalErrors[0]} />
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
                onResetPasswordState();
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
                  <RNGMessageAlert
                    tone="green"
                    message="Your password has been updated successfully."
                  />
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
                      {
                        type: 'password',
                        name: 'confirmPassword',
                        label: 'Confirm New Password',
                        placeholder: 'Re-enter your new password',
                        required: true,
                      },
                    ],
                  }}
                  validationSchema={changePasswordSchema}
                  onSubmit={onPasswordSubmit}
                  submitLabel={isChangingPassword ? 'Changing...' : 'Change Password'}
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
      <RNGForm
        schema={formSchema}
        validationSchema={editProfileSchema}
        defaultValues={{
          email: user.email || '',
          role: user.role || '',
          name: user.name || '',
          photoUrl: user.photoUrl || '',
        }}
        onSubmit={onSubmit}
        onError={onFormError}
        submitLabel={isUpdatingProfile ? 'Updating...' : 'Update Profile'}
        showReset={false}
        requireChange={false}
      />
    </RNGPageContent>
  );
}
