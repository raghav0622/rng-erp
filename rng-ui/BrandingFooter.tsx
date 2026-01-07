import { Center, Text, rem } from '@mantine/core';

export default function BrandingFooter() {
  return (
    <Center py={rem(12)}>
      <Text size="sm" c="dimmed" fw={500}>
        © {new Date().getFullYear()} RN Goyal & Associates. All rights reserved.
      </Text>
    </Center>
  );
}
