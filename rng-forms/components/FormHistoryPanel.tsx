import {
  ActionIcon,
  Badge,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Timeline,
  Tooltip,
} from '@mantine/core';
import { IconArrowBackUp, IconArrowForwardUp, IconHistory, IconTrash } from '@tabler/icons-react';

interface HistoryEntry {
  values: any;
  timestamp: Date;
}

interface FormHistoryPanelProps {
  /**
   * History entries from useFormHistory
   */
  history: HistoryEntry[];
  /**
   * Current history index
   */
  currentIndex: number;
  /**
   * Callback to navigate to specific history entry
   */
  onGoToIndex: (index: number) => void;
  /**
   * Callback to undo
   */
  onUndo: () => void;
  /**
   * Callback to redo
   */
  onRedo: () => void;
  /**
   * Whether undo is available
   */
  canUndo: boolean;
  /**
   * Whether redo is available
   */
  canRedo: boolean;
  /**
   * Callback to clear history
   */
  onClearHistory: () => void;
  /**
   * Maximum height of the panel (default: 400px)
   */
  maxHeight?: number;
}

/**
 * Visual history timeline panel showing form changes with undo/redo controls
 *
 * @example
 * const historyState = useFormHistory();
 * <FormHistoryPanel {...historyState} />
 */
export function FormHistoryPanel({
  history,
  currentIndex,
  onGoToIndex,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearHistory,
  maxHeight = 400,
}: FormHistoryPanelProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconHistory size={20} />
            <Text fw={600}>Form History</Text>
            <Badge variant="light" size="sm">
              {history.length} entries
            </Badge>
          </Group>
          <Group gap="xs">
            <Tooltip label="Undo (Ctrl+Z)">
              <ActionIcon variant="subtle" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
                <IconArrowBackUp size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Redo (Ctrl+Y)">
              <ActionIcon variant="subtle" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
                <IconArrowForwardUp size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Clear History">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={onClearHistory}
                disabled={history.length <= 1}
                aria-label="Clear history"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <ScrollArea h={maxHeight}>
          <Timeline active={currentIndex} bulletSize={24} lineWidth={2}>
            {history.map((entry, index) => {
              const isCurrent = index === currentIndex;
              const isPast = index < currentIndex;

              return (
                <Timeline.Item
                  key={index}
                  bullet={
                    <Text size="xs" fw={isCurrent ? 700 : 400}>
                      {index + 1}
                    </Text>
                  }
                  title={
                    <Group gap="xs">
                      <Text size="sm" fw={isCurrent ? 600 : 400} c={isCurrent ? 'blue' : undefined}>
                        {isCurrent ? 'Current State' : `Change ${index + 1}`}
                      </Text>
                      {isCurrent && (
                        <Badge size="xs" variant="filled">
                          Active
                        </Badge>
                      )}
                    </Group>
                  }
                  style={{
                    cursor: 'pointer',
                    opacity: isPast || isCurrent ? 1 : 0.5,
                  }}
                  onClick={() => onGoToIndex(index)}
                >
                  <Text size="xs" c="dimmed">
                    {formatTime(entry.timestamp)}
                  </Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
