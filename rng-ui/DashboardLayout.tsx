import { notificationService } from '@/lib/notifications';
import { useAuthService, useAuthState } from '@/rng-firebase/auth/hooks';
import BrandingHeader from '@/ui/BrandingHeader';
import DarkModeButton from '@/ui/DarkModeButton';
import { AppShell, Button, Group, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthState();
  const authService = useAuthService();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authService.signOut();
      notificationService.success('Logged out');
      router.replace('/login');
    } catch (err) {
      notificationService.fromError(err, 'Logout failed');
    }
  };

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 220, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <BrandingHeader />
          <Group>
            <Group>
              {user && <Text size="sm">{user.email}</Text>}
              <Button size="xs" color="red" onClick={handleLogout}>
                Logout
              </Button>
            </Group>
            <DarkModeButton />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Text size="sm" c="dimmed">
          Navigation
        </Text>
        {/* Add nav links here */}
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
