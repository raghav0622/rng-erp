'use client';

import { useInviteUserScreen } from './hooks/useInviteUserScreen';
import { InviteUserView } from './ui-components/InviteUserView';

export function InviteUserScreen() {
  const { externalErrors, inviteComplete, invitedEmail, inviteUserSchema, handleSubmit } =
    useInviteUserScreen();

  return (
    <InviteUserView
      inviteComplete={inviteComplete}
      invitedEmail={invitedEmail}
      externalErrors={externalErrors}
      inviteUserSchema={inviteUserSchema}
      onSubmit={handleSubmit}
    />
  );
}
