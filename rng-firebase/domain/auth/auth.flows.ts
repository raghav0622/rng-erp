import type { AuthStatus } from './auth.types';

/**
 * Auth Flows Contract — Phase 0.5
 * Enumerates all possible authentication flows, their preconditions, allowed/forbidden transitions, and required errors.
 */

export enum AuthFlow {
  AppBoot = 'APP_BOOT',
  SilentSessionRestore = 'SILENT_SESSION_RESTORE',
  OwnerBootstrap = 'OWNER_BOOTSTRAP',
  InvitedSignup = 'INVITED_SIGNUP',
  SignInSuccess = 'SIGN_IN_SUCCESS',
  SignInFailure = 'SIGN_IN_FAILURE',
  DisabledUserLoginAttempt = 'DISABLED_USER_LOGIN_ATTEMPT',
  EmailUnverifiedAccess = 'EMAIL_UNVERIFIED_ACCESS',
  EmailVerificationResend = 'EMAIL_VERIFICATION_RESEND',
  PasswordReset = 'PASSWORD_RESET',
  UserDisabledMidSession = 'USER_DISABLED_MID_SESSION',
  SignOut = 'SIGN_OUT',
}

export type AuthFlowResult = {
  flow: AuthFlow;
  resultingStatus: AuthStatus | 'ERROR';
};

export const AUTH_FLOW_RESULTS: AuthFlowResult[] = [
  { flow: AuthFlow.AppBoot, resultingStatus: 'unauthenticated' },
  { flow: AuthFlow.SilentSessionRestore, resultingStatus: 'authenticated' },
  { flow: AuthFlow.OwnerBootstrap, resultingStatus: 'owner_bootstrap_allowed' },
  { flow: AuthFlow.InvitedSignup, resultingStatus: 'invited_signup_allowed' },
  { flow: AuthFlow.SignInSuccess, resultingStatus: 'authenticated' },
  { flow: AuthFlow.SignInFailure, resultingStatus: 'unauthenticated' },
  { flow: AuthFlow.DisabledUserLoginAttempt, resultingStatus: 'disabled' },
  { flow: AuthFlow.EmailUnverifiedAccess, resultingStatus: 'email_unverified' },
  { flow: AuthFlow.EmailVerificationResend, resultingStatus: 'email_unverified' },
  { flow: AuthFlow.PasswordReset, resultingStatus: 'unauthenticated' },
  { flow: AuthFlow.UserDisabledMidSession, resultingStatus: 'disabled' },
  { flow: AuthFlow.SignOut, resultingStatus: 'unauthenticated' },
];
// ...existing code...

/**
 * Flow contract for each AuthFlow
 */
export interface AuthFlowContract {
  flow: AuthFlow;
  preconditions: string[];
  allowedTransitions: AuthFlow[];
  forbiddenTransitions: AuthFlow[];
  requiredErrors: string[];
}

// Example: (Full list must be maintained for all flows)
export const AUTH_FLOW_CONTRACTS: AuthFlowContract[] = [
  {
    flow: AuthFlow.AppBoot,
    preconditions: ['App starts', 'No session present'],
    allowedTransitions: [
      AuthFlow.SilentSessionRestore,
      AuthFlow.OwnerBootstrap,
      AuthFlow.InvitedSignup,
      AuthFlow.SignInFailure,
    ],
    forbiddenTransitions: [AuthFlow.SignInSuccess, AuthFlow.SignOut],
    requiredErrors: [],
  },
  {
    flow: AuthFlow.SilentSessionRestore,
    preconditions: ['Session token present'],
    allowedTransitions: [AuthFlow.SignInSuccess, AuthFlow.SignInFailure],
    forbiddenTransitions: [AuthFlow.OwnerBootstrap],
    requiredErrors: ['InvalidCredentialsError'],
  },
  {
    flow: AuthFlow.OwnerBootstrap,
    preconditions: ['No users exist', 'Email matches OWNER_EMAIL'],
    allowedTransitions: [AuthFlow.SignInSuccess, AuthFlow.SignInFailure],
    forbiddenTransitions: [AuthFlow.InvitedSignup, AuthFlow.OwnerBootstrap],
    requiredErrors: ['OwnerAlreadyExistsError', 'OwnerBootstrapError'],
  },
  {
    flow: AuthFlow.InvitedSignup,
    preconditions: ['Valid invite exists'],
    allowedTransitions: [AuthFlow.SignInSuccess, AuthFlow.SignInFailure],
    forbiddenTransitions: [AuthFlow.OwnerBootstrap],
    requiredErrors: ['SignupNotAllowedError'],
  },
  {
    flow: AuthFlow.SignInSuccess,
    preconditions: ['Valid credentials', 'User is active'],
    allowedTransitions: [AuthFlow.SignOut, AuthFlow.UserDisabledMidSession],
    forbiddenTransitions: [AuthFlow.SignInFailure],
    requiredErrors: [],
  },
  {
    flow: AuthFlow.SignInFailure,
    preconditions: ['Invalid credentials', 'User is disabled', 'Email not verified'],
    allowedTransitions: [AuthFlow.SignInSuccess, AuthFlow.PasswordReset],
    forbiddenTransitions: [AuthFlow.OwnerBootstrap],
    requiredErrors: ['InvalidCredentialsError', 'AuthDisabledError', 'EmailNotVerifiedError'],
  },
  {
    flow: AuthFlow.DisabledUserLoginAttempt,
    preconditions: ['User is disabled'],
    allowedTransitions: [AuthFlow.SignInFailure],
    forbiddenTransitions: [AuthFlow.SignInSuccess],
    requiredErrors: ['AuthDisabledError'],
  },
  {
    flow: AuthFlow.EmailUnverifiedAccess,
    preconditions: ['User is not email verified'],
    allowedTransitions: [AuthFlow.EmailVerificationResend, AuthFlow.SignOut],
    forbiddenTransitions: [AuthFlow.SignInSuccess],
    requiredErrors: ['EmailNotVerifiedError'],
  },
  {
    flow: AuthFlow.EmailVerificationResend,
    preconditions: ['User is not email verified'],
    allowedTransitions: [AuthFlow.SignInSuccess, AuthFlow.SignInFailure],
    forbiddenTransitions: [AuthFlow.OwnerBootstrap],
    requiredErrors: [],
  },
  {
    flow: AuthFlow.PasswordReset,
    preconditions: ['User requests password reset'],
    allowedTransitions: [AuthFlow.SignInSuccess, AuthFlow.SignInFailure],
    forbiddenTransitions: [AuthFlow.OwnerBootstrap],
    requiredErrors: [],
  },
  {
    flow: AuthFlow.UserDisabledMidSession,
    preconditions: ['User is disabled while authenticated'],
    allowedTransitions: [AuthFlow.SignInFailure, AuthFlow.SignOut],
    forbiddenTransitions: [AuthFlow.SignInSuccess],
    requiredErrors: ['AuthDisabledError'],
  },
  {
    flow: AuthFlow.SignOut,
    preconditions: ['User is authenticated'],
    allowedTransitions: [AuthFlow.AppBoot, AuthFlow.SignInFailure],
    forbiddenTransitions: [AuthFlow.SignInSuccess],
    requiredErrors: [],
  },
];
