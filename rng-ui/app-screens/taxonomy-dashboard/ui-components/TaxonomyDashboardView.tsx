'use client';

import { RNGMessageAlert, RNGPageContent } from '@/rng-ui/ux';
import { ActionIcon, Badge, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import type { TaxonomyCategory } from '../hooks/useTaxonomyDashboard';

export interface TaxonomyDashboardViewProps {
  taxonomies: TaxonomyCategory[];
  isLoading: boolean;
  deletingValue: string | null;
  onDeleteValue: (parent: string, value: string) => void;
}

export function TaxonomyDashboardView({
  taxonomies,
  isLoading,
  deletingValue,
  onDeleteValue,
}: TaxonomyDashboardViewProps) {
  return (
    <RNGPageContent
      title="Taxonomy Management"
      description="View and manage taxonomy values created from form inputs"
    >
      {isLoading ? (
        <Text c="dimmed" ta="center" py="xl">
          Loading taxonomy data...
        </Text>
      ) : taxonomies.length === 0 ? (
        <RNGMessageAlert
          icon={<IconAlertCircle size={32} />}
          tone="blue"
          title="No Taxonomy Data"
          message="Values will appear when users create entries in taxonomy form fields"
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="md">
          {taxonomies.map((taxonomy) => (
            <Card key={taxonomy.name} shadow="sm" padding="lg" withBorder>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <Title order={4} size="h5" style={{ wordBreak: 'break-word' }}>
                    {taxonomy.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Title>
                  <Badge variant="light" size="sm">
                    {taxonomy.values.length}
                  </Badge>
                </Group>

                <Stack gap="xs">
                  {taxonomy.values.map((value) => {
                    const deleteKey = `${taxonomy.name}:${value}`;
                    const isDeleting = deletingValue === deleteKey;
                    return (
                      <Group
                        key={value}
                        justify="space-between"
                        wrap="nowrap"
                        gap="xs"
                        p="xs"
                        bg="var(--mantine-color-default-hover)"
                        style={{
                          borderRadius: 'var(--mantine-radius-sm)',
                        }}
                      >
                        <Text size="sm" style={{ flex: 1, wordBreak: 'break-word' }}>
                          {value}
                        </Text>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => onDeleteValue(taxonomy.name, value)}
                          loading={isDeleting}
                          disabled={deletingValue !== null && !isDeleting}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    );
                  })}
                </Stack>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </RNGPageContent>
  );
}
