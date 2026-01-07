'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, type FieldValues } from 'react-hook-form';

interface HistoryEntry<TValues> {
  values: TValues;
  timestamp: Date;
}

interface UseFormHistoryOptions {
  /**
   * Maximum number of history entries to keep (default: 50)
   */
  maxHistory?: number;
  /**
   * Enable keyboard shortcuts (Ctrl+Z, Ctrl+Y) (default: true)
   */
  enableKeyboardShortcuts?: boolean;
  /**
   * Debounce time for recording changes (default: 500ms)
   */
  debounceMs?: number;
}

/**
 * Hook for undo/redo functionality with keyboard shortcuts
 *
 * @example
 * const { undo, redo, canUndo, canRedo, history } = useFormHistory({
 *   maxHistory: 50,
 *   enableKeyboardShortcuts: true,
 * });
 *
 * <Button onClick={undo} disabled={!canUndo}>Undo</Button>
 * <Button onClick={redo} disabled={!canRedo}>Redo</Button>
 */
export function useFormHistory<TValues extends FieldValues>(options: UseFormHistoryOptions = {}) {
  const { maxHistory = 50, enableKeyboardShortcuts = true, debounceMs = 500 } = options;
  const { watch, reset, getValues } = useFormContext<TValues>();

  const [history, setHistory] = useState<HistoryEntry<TValues>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const isRestoringRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Record initial state
  useEffect(() => {
    const initialValues = getValues();
    setHistory([{ values: initialValues, timestamp: new Date() }]);
    setCurrentIndex(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch for changes and record to history
  useEffect(() => {
    const subscription = watch((values) => {
      // Don't record if we're restoring from history
      if (isRestoringRef.current) return;

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce recording to history
      debounceTimerRef.current = setTimeout(() => {
        setHistory((prev) => {
          // If we're not at the end of history, remove future entries
          const newHistory = prev.slice(0, currentIndex + 1);

          // Add new entry
          const newEntry: HistoryEntry<TValues> = {
            values: values as TValues,
            timestamp: new Date(),
          };
          newHistory.push(newEntry);

          // Limit history size
          if (newHistory.length > maxHistory) {
            newHistory.shift();
            setCurrentIndex((prev) => prev - 1);
          } else {
            setCurrentIndex((prev) => prev + 1);
          }

          return newHistory;
        });
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [watch, currentIndex, maxHistory, debounceMs]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      const previousIndex = currentIndex - 1;
      const previousEntry = history[previousIndex];

      if (!previousEntry) return;

      isRestoringRef.current = true;
      reset(previousEntry.values);
      setCurrentIndex(previousIndex);

      // Reset flag after a short delay
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
  }, [currentIndex, history, reset]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextEntry = history[nextIndex];

      if (!nextEntry) return;

      isRestoringRef.current = true;
      reset(nextEntry.values);
      setCurrentIndex(nextIndex);

      // Reset flag after a short delay
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
  }, [currentIndex, history, reset]);

  const goToHistoryIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < history.length) {
        const entry = history[index];

        if (!entry) return;

        isRestoringRef.current = true;
        reset(entry.values);
        setCurrentIndex(index);

        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      }
    },
    [history, reset],
  );

  const clearHistory = useCallback(() => {
    const currentValues = getValues();
    setHistory([{ values: currentValues, timestamp: new Date() }]);
    setCurrentIndex(0);
  }, [getValues]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Ctrl+Y or Cmd+Shift+Z for redo
      else if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')
      ) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, enableKeyboardShortcuts]);

  return {
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    history,
    currentIndex,
    goToHistoryIndex,
    clearHistory,
  };
}
