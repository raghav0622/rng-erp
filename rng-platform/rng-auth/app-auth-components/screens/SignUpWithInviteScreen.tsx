'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { Anchor, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signUpWithInviteSchema } from '../../app-auth-hooks/schemas';
import { useSignUpWithInvite } from '../../app-auth-hooks/useAuthMutations';
import {
  FormWrapper,
  LoadingState,
  ScreenContainer,
  SuccessMessage,
} from '../shared/ScreenComponents';
import { handleMutationError } from '../utils/screenHelpers';

export interface SignUpWithInviteScreenProps {
  redirectTo?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function SignUpWithInviteScreen({
  redirectTo = '/dashboard',
  header,
  footer,
}: SignUpWithInviteScreenProps) {
  const router = useRouter();
  const signUpWithInvite = useSignUpWithInvite();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [signupComplete, setSignupComplete] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => setExternalErrors([]), []);

  const handleSubmit = async (values: any) => {
    setExternalErrors([]);
    try {
      await signUpWithInvite.mutateAsync(values);
      setSignupComplete(true);
      setIsRedirecting(true);
      setTimeout(() => router.push(redirectTo), 2000);
    } catch (err) {
      handleMutationError(err, setExternalErrors);
    }
  };

  if (isRedirecting) return <LoadingState message="Completing registration..." />;
  if (signupComplete)
    return (
      <SuccessMessage
        title="Registration Complete!"
        message="Your account has been created."
        redirect={redirectTo}
      />
    );

  return (
    <ScreenContainer header={header} footer={footer}>
      <FormWrapper>
        <RNGForm
          schema={{
            items: [
              {
                type: 'text',
                name: 'email',
                label: 'Email Address',
                placeholder: 'your-email@example.com',
                required: true,
                description: 'Must match the email from your invitation',
              },
              {
                type: 'password',
                name: 'password',
                label: 'Create Password',
                placeholder: 'Enter a strong password',
                required: true,
                description:
                  'Minimum 8 characters with uppercase, lowercase, number, and special character',
                showStrength: true,
              },
              {
                type: 'password',
                name: 'confirmPassword',
                label: 'Confirm Password',
                placeholder: 'Re-enter your password',
                required: true,
              },
            ],
          }}
          validationSchema={signUpWithInviteSchema}
          onSubmit={handleSubmit}
          externalErrors={externalErrors}
          submitLabel="Complete Registration"
          headerTitle="Complete Your Registration"
          headerDescription="Enter your password to activate your account"
          showReset={false}
        />
        <Text size="sm" c="dimmed" ta="center" mt="md">
          Already have an account? <Anchor href="/auth/signin">Sign In</Anchor>
        </Text>
      </FormWrapper>
    </ScreenContainer>
  );
}
