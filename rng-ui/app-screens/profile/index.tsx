'use client';

import { useProfileScreen } from './hooks/useProfileScreen';
import { ProfileView } from './ui-components/ProfileView';

export function ProfileScreen() {
  const {
    user,
    externalErrors,
    showSuccess,
    passwordErrors,
    passwordSuccess,
    isUpdatingProfile,
    isChangingPassword,
    handleSubmit,
    handlePasswordSubmit,
    handleFormError,
    resetPasswordState,
    changePasswordSchema,
  } = useProfileScreen();

  return (
    <ProfileView
      user={user}
      externalErrors={externalErrors}
      showSuccess={showSuccess}
      passwordErrors={passwordErrors}
      passwordSuccess={passwordSuccess}
      isUpdatingProfile={isUpdatingProfile}
      isChangingPassword={isChangingPassword}
      onSubmit={handleSubmit}
      onPasswordSubmit={handlePasswordSubmit}
      onFormError={handleFormError}
      onResetPasswordState={resetPasswordState}
      changePasswordSchema={changePasswordSchema}
    />
  );
}
