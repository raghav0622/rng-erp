import { Center, Group, Text, rem } from '@mantine/core';
import { IconBuilding } from '@tabler/icons-react';

export default function BrandingHeader() {
  return (
    <Center py={rem(16)}>
      <Group gap={rem(12)}>
        <IconBuilding size={32} color="#228be6" />
        <Text size="xl" fw={900} style={{ letterSpacing: 1 }}>
          RN Goyal & Associates
        </Text>
      </Group>
    </Center>
  );
}
