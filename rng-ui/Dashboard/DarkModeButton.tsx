'use client';

import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

/**
 * Beautiful dark mode toggle button with smooth transitions
 * Prevents hydration mismatch by waiting for client mount
 */
export function DarkModeButton() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch: only render icon after client mount
  if (!mounted) return null;

  return (
    <Tooltip label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} withArrow>
      <ActionIcon
        variant="subtle"
        color={isDark ? 'yellow' : 'blue'}
        aria-label="Toggle dark mode"
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
        size="lg"
      >
        {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
      </ActionIcon>
    </Tooltip>
  );
}
