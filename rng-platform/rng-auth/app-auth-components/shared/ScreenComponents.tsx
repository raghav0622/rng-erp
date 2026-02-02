import { Alert, Button, Container, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

export function ScreenContainer({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container size="xs" py="xl">
      <Stack gap="xl">
        {header}
        {children}
        {footer}
      </Stack>
    </Container>
  );
}

export function ScreenHeader({
  title,
  description,
  icon: Icon,
  color = 'blue',
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number }>;
  color?: string;
}) {
  return (
    <Stack gap="xs" align="center">
      <div style={{ color: `var(--mantine-color-${color}-6)` }}>
        <Icon size={64} />
      </div>
      <Title order={1}>{title}</Title>
      <Text c="dimmed" size="sm">
        {description}
      </Text>
    </Stack>
  );
}

export function SuccessMessage({
  title,
  message,
  detail,
  redirect,
  delay = 2000,
}: {
  title: string;
  message: string;
  detail?: string;
  redirect?: string;
  delay?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!redirect) return;
    const timer = setTimeout(() => router.push(redirect), delay);
    return () => clearTimeout(timer);
  }, [redirect, delay, router]);

  return (
    <Container size="xs" py="xl">
      <Stack gap="xl">
        <Stack gap="xs" align="center">
          <div style={{ color: 'var(--mantine-color-green-6)' }}>
            <IconCheck size={64} />
          </div>
          <Title order={2}>{title}</Title>
          <Text c="dimmed" size="sm" ta="center">
            {message}
          </Text>
          {detail && (
            <Text fw={600} size="sm">
              {detail}
            </Text>
          )}
        </Stack>
        {redirect && (
          <Paper shadow="sm" p="xl" radius="md">
            <Text size="sm" ta="center">
              Redirecting...
            </Text>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

export function ErrorAlert({ title, description }: { title: string; description?: string }) {
  return (
    <Alert icon={<IconAlertCircle size={16} />} title={title} color="blue" variant="light">
      <Stack gap="sm">
        {description && <Text size="sm">{description}</Text>}
        <Button component="a" href="/auth/signin" variant="light" size="sm">
          Go to Sign In
        </Button>
      </Stack>
    </Alert>
  );
}

export function LoadingState({ message }: { message: string }) {
  return (
    <Container size="xs" py="xl">
      <Stack gap="xl" align="center">
        <Loader size="lg" />
        <Text>{message}</Text>
      </Stack>
    </Container>
  );
}

export function FormWrapper({ children }: { children: ReactNode }) {
  return (
    <Paper shadow="sm" p="xl" radius="md">
      {children}
    </Paper>
  );
}
