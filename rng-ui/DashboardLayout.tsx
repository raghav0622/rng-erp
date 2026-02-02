// import { notificationService } from '@/lib/notificationService';
// import { useAuthService, useAuthState } from '@/rng-firebase/auth/hooks';
import DarkModeButton from '@/rng-ui/DarkModeButton';
import { AppShell, Button, Group, Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import BrandingHeader from '../rng-ui/BrandingHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Stubbed auth state for build compatibility
  const user: any = null;
  const authService = {
    signOut: async () => {},
  };
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authService.signOut();
      // notificationService.notify('Logged out');
      router.replace('/login');
    } catch (err: any) {
      // notificationService.notify('Logout failed: ' + (err?.message || String(err)));
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
