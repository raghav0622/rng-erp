'use client';

import { RNGPageContent } from '@/rng-ui/ux';
import { Button, Stack, Tabs, TextInput } from '@mantine/core';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import { ReactNode } from 'react';

interface UserManagementLayoutProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  activeTab: string | null;
  onTabChange: (value: string | null) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  internalContent: ReactNode;
  clientContent: ReactNode;
}

export function UserManagementLayout({
  searchTerm,
  onSearchTermChange,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  internalContent,
  clientContent,
}: UserManagementLayoutProps) {
  return (
    <RNGPageContent
      title="User Management"
      description="Manage team members and client users"
      actions={
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={onRefresh}
          loading={isRefreshing}
        >
          Refresh
        </Button>
      }
    >
      <Stack gap="lg">
        <TextInput
          placeholder="Search by name, email, or role..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.currentTarget.value)}
        />

        <Tabs value={activeTab} onChange={onTabChange}>
          <Tabs.List>
            <Tabs.Tab value="internal">Internal Users</Tabs.Tab>
            <Tabs.Tab value="clients">Client Users</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="internal" pt="md">
            {internalContent}
          </Tabs.Panel>

          <Tabs.Panel value="clients" pt="md">
            {clientContent}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </RNGPageContent>
  );
}
