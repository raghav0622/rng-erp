'use client';

import { Group, Text, Tooltip } from '@mantine/core';
import { IconHelpCircle } from '@tabler/icons-react';

export interface LabelWithHelpProps {
  label: string;
  help: string;
}

export function LabelWithHelp({ label, help }: LabelWithHelpProps) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text component="span" size="sm" fw={500}>
        {label}
      </Text>
      <Tooltip label={help} withArrow>
        <IconHelpCircle size={14} style={{ opacity: 0.7 }} aria-label="Help" />
      </Tooltip>
    </Group>
  );
}
