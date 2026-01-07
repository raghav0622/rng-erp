'use client';

import { Button, Center, Container, Paper, Text, Title } from '@mantine/core';
import { IconAlertCircle as IconDeviceDesktopAlert } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

const CHANNEL_NAME = 'rng_app_instance_lock';

export function SingleInstanceGuard({ children }: { children: React.ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);

    // 1. Listen for messages from other tabs
    channel.onmessage = (event) => {
      // If a new tab asks "Is anyone here?", we scream "YES!"
      if (event.data === 'CHECK_ALIVE') {
        channel.postMessage('I_AM_ALIVE');
      }

      // If we hear "I_AM_ALIVE", it means we are the second tab. block access.
      if (event.data === 'I_AM_ALIVE') {
        setIsBlocked(true);
      }
    };

    // 2. Ask "Is anyone else here?" when we mount
    channel.postMessage('CHECK_ALIVE');

    return () => {
      channel.close();
    };
  }, []);

  const handleTakeover = () => {
    // Advanced: Force other tabs to close (optional feature)
    // For now, we just reload effectively becoming the "new" main tab
    window.location.reload();
  };

  if (isBlocked) {
    return (
      <Container size="xs" h="100vh" style={{ display: 'grid', placeItems: 'center' }}>
        <Paper shadow="md" p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
          <Center mb="md">
            <IconDeviceDesktopAlert size={50} color="red" />
          </Center>
          <Title order={2} mb="sm">
            App is Open in Another Tab
          </Title>
          <Text c="dimmed" mb="xl">
            To prevent data conflicts and ensure real-time accuracy, this application can only be
            open in one tab at a time.
          </Text>
          <Button fullWidth onClick={handleTakeover} variant="light" color="red">
            Reload & Take Over
          </Button>
        </Paper>
      </Container>
    );
  }

  return <>{children}</>;
}
