'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowDownRight, IconArrowUpRight, IconPlus } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

/**
 * Dashboard Page
 *
 * Requirements (from README.dev.md):
 * - Status cards (summary metrics)
 * - Primary work list (table on desktop, cards on mobile)
 * - Secondary panel/section (details/recent activity)
 * - Auth-aware empty states
 * - Render only when authenticated (parent layout enforces)
 * - Page title + subtitle, single primary action (top-right)
 * - Optional filters/tabs
 * - Responsive and density-aware
 * - Multitasking-capable (master-detail split on desktop)
 * - Use placeholder data only for business data
 */
export default function Dashboard() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'pending'>('all');

  // Placeholder data
  const statusCards = [
    { label: 'Total Revenue', value: '$24,580', change: '+12.5%', trend: 'up' },
    { label: 'Active Projects', value: '8', change: '+2', trend: 'up' },
    { label: 'Pending Tasks', value: '14', change: '-3', trend: 'down' },
    { label: 'Team Members', value: '12', change: '+1', trend: 'up' },
  ];

  const workItems = [
    {
      id: '1',
      name: 'Q1 Planning',
      status: 'active',
      owner: 'Alice Johnson',
      dueDate: '2026-02-14',
      progress: 75,
    },
    {
      id: '2',
      name: 'API Integration',
      status: 'active',
      owner: 'Bob Smith',
      dueDate: '2026-02-21',
      progress: 45,
    },
    {
      id: '3',
      name: 'UI Redesign',
      status: 'pending',
      owner: 'Carol Davis',
      dueDate: '2026-02-28',
      progress: 0,
    },
    {
      id: '4',
      name: 'Performance Audit',
      status: 'active',
      owner: 'David Lee',
      dueDate: '2026-02-10',
      progress: 90,
    },
    {
      id: '5',
      name: 'Documentation',
      status: 'pending',
      owner: 'Eve Wilson',
      dueDate: '2026-03-07',
      progress: 20,
    },
  ];

  const recentActivity = [
    { id: '1', action: 'Project created', user: 'Alice Johnson', time: '2 hours ago' },
    { id: '2', action: 'Task updated', user: 'Bob Smith', time: '4 hours ago' },
    { id: '3', action: 'Comment added', user: 'Carol Davis', time: '1 day ago' },
    { id: '4', action: 'File uploaded', user: 'David Lee', time: '2 days ago' },
  ];

  // Filter work items
  const filteredItems = useMemo(
    () =>
      filterActive === 'all' ? workItems : workItems.filter((item) => item.status === filterActive),
    [filterActive],
  );

  const selectedItemData = selectedItem ? workItems.find((item) => item.id === selectedItem) : null;

  const getStatusColor = (status: string) => (status === 'active' ? 'green' : 'yellow');
  const getTrendColor = (trend: string) => (trend === 'up' ? 'green' : 'red');

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text component="h1" fw={700} size="xl">
            Dashboard
          </Text>
          <Text c="dimmed" size="sm">
            Welcome back. Here's what's happening with your projects today.
          </Text>
        </Box>

        {/* Primary Action: Create New (Desktop only) */}
        {!isMobile && (
          <Button leftSection={<IconPlus size={16} />} variant="filled">
            New Project
          </Button>
        )}
      </Group>

      {/* Status Cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {statusCards.map((card) => (
          <StatusCard key={card.label} {...card} />
        ))}
      </SimpleGrid>

      {/* Main Content: Master-Detail Layout */}
      {isMobile ? (
        // Mobile: Single column, cards layout
        <MobileWorkList
          items={filteredItems}
          filterActive={filterActive}
          onFilterChange={setFilterActive}
        />
      ) : isTablet ? (
        // Tablet: Single column, table layout (no detail panel)
        <TabletWorkList
          items={filteredItems}
          filterActive={filterActive}
          onFilterChange={setFilterActive}
          onSelectItem={setSelectedItem}
          selectedItem={selectedItem}
        />
      ) : (
        // Desktop: Master-detail split view with side panel
        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <DesktopWorkList
              items={filteredItems}
              filterActive={filterActive}
              onFilterChange={setFilterActive}
              onSelectItem={setSelectedItem}
              selectedItem={selectedItem}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 4 }}>
            {/* Detail Panel / Secondary Section */}
            <DetailPanel selectedItem={selectedItemData} recentActivity={recentActivity} />
          </Grid.Col>
        </Grid>
      )}
    </Stack>
  );
}

/**
 * Status card showing metric with trend.
 */
function StatusCard({ label, value, change, trend }: any) {
  const trendColor = trend === 'up' ? 'green' : 'red';
  const TrendIcon = trend === 'up' ? IconArrowUpRight : IconArrowDownRight;

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Text size="sm" c="dimmed" fw={600}>
          {label}
        </Text>
        <ThemeIcon size="lg" variant="light" color={trendColor} radius="md">
          <TrendIcon size={18} />
        </ThemeIcon>
      </Group>
      <Group align="flex-end" gap="xs">
        <Text fw={700} size="lg">
          {value}
        </Text>
        <Text size="xs" c={trendColor} fw={500}>
          {change}
        </Text>
      </Group>
    </Paper>
  );
}

/**
 * Desktop work list with table and filter tabs.
 * Primary work surface on desktop.
 */
function DesktopWorkList({
  items,
  filterActive,
  onFilterChange,
  onSelectItem,
  selectedItem,
}: {
  items: any[];
  filterActive: string;
  onFilterChange: (value: string | any) => void;
  onSelectItem: (id: string) => void;
  selectedItem: string | null;
}) {
  return (
    <Stack gap="md">
      {/* Filters */}
      <Group gap="xs">
        <Button
          variant={filterActive === 'all' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('all' as any)}
        >
          All
        </Button>
        <Button
          variant={filterActive === 'active' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('active' as any)}
        >
          Active
        </Button>
        <Button
          variant={filterActive === 'pending' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('pending' as any)}
        >
          Pending
        </Button>
      </Group>

      {/* Work List Table */}
      <Card withBorder>
        <Table striped highlightOnHover stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th w="40%">Project</Table.Th>
              <Table.Th w="15%">Owner</Table.Th>
              <Table.Th w="15%">Status</Table.Th>
              <Table.Th w="15%">Due Date</Table.Th>
              <Table.Th w="15%" ta="right">
                Progress
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <Table.Tr
                  key={item.id}
                  style={{
                    cursor: 'pointer',
                    backgroundColor:
                      selectedItem === item.id ? 'var(--mantine-color-blue-0)' : undefined,
                  }}
                  onClick={() => onSelectItem(item.id)}
                >
                  <Table.Td fw={500}>{item.name}</Table.Td>
                  <Table.Td style={{ color: 'var(--mantine-color-gray-6)' }}>
                    <Text size="sm">{item.owner}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="light"
                      color={item.status === 'active' ? 'green' : 'yellow'}
                    >
                      {item.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ color: 'var(--mantine-color-gray-6)' }}>
                    <Text size="sm">{item.dueDate}</Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm">{item.progress}%</Text>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={5} ta="center" py="lg">
                  <Text c="dimmed">No projects found.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}

/**
 * Tablet work list (single column, table layout, no detail panel).
 */
function TabletWorkList({
  items,
  filterActive,
  onFilterChange,
  onSelectItem,
  selectedItem,
}: {
  items: any[];
  filterActive: string;
  onFilterChange: (value: string | any) => void;
  onSelectItem: (id: string) => void;
  selectedItem: string | null;
}) {
  return (
    <Stack gap="md">
      {/* Filters */}
      <Group gap="xs">
        <Button
          variant={filterActive === 'all' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('all' as any)}
        >
          All
        </Button>
        <Button
          variant={filterActive === 'active' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('active' as any)}
        >
          Active
        </Button>
        <Button
          variant={filterActive === 'pending' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('pending' as any)}
        >
          Pending
        </Button>
      </Group>

      {/* Work List Table */}
      <Card withBorder>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Project</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th ta="right">Progress</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.length > 0 ? (
              items.map((item) => (
                <Table.Tr
                  key={item.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectItem(item.id)}
                >
                  <Table.Td fw={500}>{item.name}</Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="light"
                      color={item.status === 'active' ? 'green' : 'yellow'}
                    >
                      {item.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right">{item.progress}%</Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={3} ta="center" py="lg">
                  <Text c="dimmed">No projects found.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}

/**
 * Mobile work list (cards layout, read-only, no detail panel).
 */
function MobileWorkList({
  items,
  filterActive,
  onFilterChange,
}: {
  items: any[];
  filterActive: string;
  onFilterChange: (value: string | any) => void;
}) {
  return (
    <Stack gap="md">
      {/* Filters */}
      <Group gap="xs">
        <Button
          variant={filterActive === 'all' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('all' as any)}
        >
          All
        </Button>
        <Button
          variant={filterActive === 'active' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('active' as any)}
        >
          Active
        </Button>
        <Button
          variant={filterActive === 'pending' ? 'filled' : 'light'}
          size="xs"
          onClick={() => onFilterChange('pending' as any)}
        >
          Pending
        </Button>
      </Group>

      {/* Mobile Cards */}
      {items.length > 0 ? (
        items.map((item) => (
          <Card key={item.id} withBorder p="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={500}>{item.name}</Text>
                <Badge
                  size="sm"
                  variant="light"
                  color={item.status === 'active' ? 'green' : 'yellow'}
                >
                  {item.status}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Owner: {item.owner}
              </Text>
              <Text size="sm" c="dimmed">
                Due: {item.dueDate}
              </Text>
              <Box>
                <Text size="xs" mb={4}>
                  Progress: {item.progress}%
                </Text>
              </Box>
            </Stack>
          </Card>
        ))
      ) : (
        <Center py="lg">
          <Text c="dimmed">No projects found.</Text>
        </Center>
      )}
    </Stack>
  );
}

/**
 * Detail panel / secondary section (desktop only).
 * Shows details of selected item + recent activity.
 */
function DetailPanel({
  selectedItem,
  recentActivity,
}: {
  selectedItem: any;
  recentActivity: any[];
}) {
  return (
    <Stack gap="md">
      {/* Selected Item Details */}
      <Card withBorder title={selectedItem ? selectedItem.name : 'Select a project'}>
        {selectedItem ? (
          <Stack gap="md">
            <Box>
              <Text size="sm" fw={600} mb={4}>
                Details
              </Text>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Owner:
                  </Text>
                  <Text size="sm">{selectedItem.owner}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Status:
                  </Text>
                  <Badge
                    size="sm"
                    variant="light"
                    color={selectedItem.status === 'active' ? 'green' : 'yellow'}
                  >
                    {selectedItem.status}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Due Date:
                  </Text>
                  <Text size="sm">{selectedItem.dueDate}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Progress:
                  </Text>
                  <Text size="sm" fw={600}>
                    {selectedItem.progress}%
                  </Text>
                </Group>
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="lg">
            Select a project from the list to view details.
          </Text>
        )}
      </Card>

      {/* Recent Activity */}
      <Card withBorder title="Recent Activity">
        <Stack gap="sm">
          {recentActivity.slice(0, 4).map((activity) => (
            <Box key={activity.id}>
              <Text size="sm" fw={500}>
                {activity.action}
              </Text>
              <Group gap={4} mt={4}>
                <Text size="xs" c="dimmed">
                  {activity.user}
                </Text>
                <Text size="xs" c="dimmed">
                  •
                </Text>
                <Text size="xs" c="dimmed">
                  {activity.time}
                </Text>
              </Group>
            </Box>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
