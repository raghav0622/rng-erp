'use client';

import {
  changePasswordSchema,
  useChangePassword,
  useRequireAuthenticated,
  useUpdateUserPhoto,
  useUpdateUserProfile,
  type ChangePasswordInput,
} from '@/rng-platform';
import { useRNGNotification } from '@/rng-ui/ux';
import { useState } from 'react';
import type { ZodTypeAny } from 'zod';

export function useProfileScreen(): {
  user: ReturnType<typeof useRequireAuthenticated>;
  externalErrors: string[];
  showSuccess: boolean;
  passwordErrors: string[];
  passwordSuccess: boolean;
  isUpdatingProfile: boolean;
  isChangingPassword: boolean;
  handleSubmit: (values: {
    name: string;
    email?: string;
    role?: string;
    photoUrl?: any;
  }) => Promise<void>;
  handlePasswordSubmit: (values: ChangePasswordInput) => Promise<void>;
  handleFormError: (errors: Record<string, any>) => void;
  resetPasswordState: () => void;
  changePasswordSchema: ZodTypeAny;
} {
  const user = useRequireAuthenticated();
  const updatePhoto = useUpdateUserPhoto();
  const updateProfile = useUpdateUserProfile();
  const changePassword = useChangePassword();
  const notifications = useRNGNotification();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSubmit = async (values: {
    name: string;
    email?: string;
    role?: string;
    photoUrl?: any;
  }) => {
    setExternalErrors([]);
    setShowSuccess(false);

    try {
      if (values.name !== user.name) {
        await updateProfile.mutateAsync({
          userId: user.id,
          data: { name: values.name },
        });
      }

      const currentPhotoUrl = user?.photoUrl || '';
      let nextPhoto = values.photoUrl;
      let shouldUpdatePhoto = false;

      if (typeof nextPhoto === 'string') {
        if (nextPhoto.trim().length === 0) {
          shouldUpdatePhoto = true;
          nextPhoto = undefined;
        } else if (nextPhoto === currentPhotoUrl) {
          shouldUpdatePhoto = false;
        } else {
          shouldUpdatePhoto = true;
        }
      } else if (nextPhoto instanceof File) {
        shouldUpdatePhoto = true;
      } else if (nextPhoto && typeof nextPhoto === 'object' && 'file' in nextPhoto) {
        shouldUpdatePhoto = true;
      }

      if (shouldUpdatePhoto) {
        await updatePhoto.mutateAsync({
          userId: user.id,
          photo: nextPhoto as File | string | undefined,
        });
      }

      setShowSuccess(true);
      notifications.showSuccess('Your profile has been updated successfully!', 'Profile Updated', {
        dedupeKey: 'profile-update-success',
      });
    } catch (error) {
      const appError = error as any;
      const errorMsg = appError?.message || 'Failed to update profile';
      setExternalErrors([errorMsg]);
      notifications.showError(errorMsg, 'Profile Update Failed', {
        dedupeKey: 'profile-update-error',
      });
    }
  };

  const handlePasswordSubmit = async (values: ChangePasswordInput) => {
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

  const handleFormError = (errors: Record<string, any>) => {
    const errorMessages = Object.entries(errors)
      .map(([_, error]: any) => error?.message || 'Validation error')
      .filter(Boolean);
    if (errorMessages.length > 0) {
      setExternalErrors(errorMessages);
    }
  };

  return {
    user,
    externalErrors,
    showSuccess,
    passwordErrors,
    passwordSuccess,
    isUpdatingProfile: updatePhoto.isPending || updateProfile.isPending,
    isChangingPassword: changePassword.isPending,
    handleSubmit,
    handlePasswordSubmit,
    handleFormError,
    resetPasswordState,
    changePasswordSchema: changePasswordSchema as ZodTypeAny,
  };
}
