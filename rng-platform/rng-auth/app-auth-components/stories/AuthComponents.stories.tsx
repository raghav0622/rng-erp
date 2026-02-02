// stories/AuthComponents.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import {
  ExternalErrorsDisplay,
  NoUsersEmptyState,
  RolePermissionComparison,
  UserAuditTimeline,
  UserCardSkeleton,
  UserDetailSkeleton,
  UserListSkeleton,
} from '../components';

/**
 * Storybook stories for auth components
 *
 * To run:
 * npm run storybook
 */

// ============================================================================
// ExternalErrorsDisplay
// ============================================================================

const meta: Meta<typeof ExternalErrorsDisplay> = {
  title: 'Components/ExternalErrorsDisplay',
  component: ExternalErrorsDisplay,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleError: Story = {
  args: {
    errors: ['Invalid email or password'],
    title: 'Authentication failed',
  },
};

export const MultipleErrors: Story = {
  args: {
    errors: ['Email is already in use', 'Password is too weak', 'Name is required'],
    title: 'Validation errors',
  },
};

export const WithDismiss: Story = {
  args: {
    errors: ['An error occurred'],
    onDismiss: () => console.log('Dismissed'),
  },
};

// ============================================================================
// EmptyStates
// ============================================================================

export const NoUsersEmpty: Story = {
  render: () => <NoUsersEmptyState />,
};

// ============================================================================
// Skeleton Loaders
// ============================================================================

export const DetailSkeleton: Story = {
  render: () => <UserDetailSkeleton />,
};

export const ListSkeleton: Story = {
  render: () => <UserListSkeleton rowCount={5} />,
};

export const CardSkeleton: Story = {
  render: () => <UserCardSkeleton />,
};

// ============================================================================
// UserAuditTimeline
// ============================================================================

const mockUser: AppUser = {
  id: 'user-123',
  email: 'alice@example.com',
  name: 'Alice Johnson',
  role: 'manager',
  roleCategory: undefined,
  roleUpdatedAt: new Date('2025-12-15'),
  roleCategoryUpdatedAt: undefined,
  inviteStatus: 'activated',
  inviteSentAt: new Date('2025-12-01'),
  inviteRespondedAt: new Date('2025-12-15'),
  isRegisteredOnERP: true,
  isDisabled: false,
  emailVerified: true,
  createdAt: new Date('2025-12-01'),
  updatedAt: new Date('2025-12-15'),
  deletedAt: null,
  authUid: 'firebase-auth-123',
  photoUrl: undefined,
  version: 1,
};

export const auditMeta: Meta<typeof UserAuditTimeline> = {
  title: 'Components/UserAuditTimeline',
  component: UserAuditTimeline,
  parameters: { layout: 'centered' },
};

export const Timeline: Story = {
  render: () => <UserAuditTimeline user={mockUser} />,
};

// ============================================================================
// RolePermissionComparison
// ============================================================================

const comparisonMeta: Meta<typeof RolePermissionComparison> = {
  title: 'Components/RolePermissionComparison',
  component: RolePermissionComparison,
  parameters: { layout: 'centered' },
};

export const Promotion: Story = {
  render: () => <RolePermissionComparison currentRole="employee" newRole="manager" />,
};

export const Demotion: Story = {
  render: () => <RolePermissionComparison currentRole="manager" newRole="employee" />,
};

export const SameRole: Story = {
  render: () => <RolePermissionComparison currentRole="employee" newRole="employee" />,
};

// ============================================================================
// TODO: Add more stories as needed
// ============================================================================

/*
// UserStatusBadge
export const ActiveUser: Story = { ... };
export const DisabledUser: Story = { ... };

// RoleBadge
export const OwnerRole: Story = { ... };
export const ManagerRole: Story = { ... };

// UserListItem
export const ListItemActive: Story = { ... };
export const ListItemDeleted: Story = { ... };

// UserInfoTable
export const UserInfo: Story = { ... };

// ConfirmationCheckbox
export const Unchecked: Story = { ... };
export const Checked: Story = { ... };

// InviteStatusBadge
export const InvitePending: Story = { ... };
export const InviteActivated: Story = { ... };

// And so on...
*/
