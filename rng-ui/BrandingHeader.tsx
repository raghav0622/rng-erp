import { Center, Group, Text, rem } from '@mantine/core';
import { IconBuilding } from '@tabler/icons-react';

export default function BrandingHeader() {
  return (
    <Center py={rem(16)}>
      <Group gap={rem(4)}>
        <IconBuilding size={32} color="#228be6" />
        <Text size="md">RN Goyal & Associates</Text>
      </Group>
    </Center>
  );
}
