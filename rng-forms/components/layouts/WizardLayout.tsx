'use client';

import { ActionIcon, Button, Group, Stack, Stepper, Text } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import { useRNGContext } from '../../core/FormContext';
import type { WizardItem } from '../../types/core';

export default function WizardLayout<TValues>(
  props: WizardItem<TValues> | { item: WizardItem<TValues> },
) {
  // Handle both direct props and wrapped item prop
  const item =
    'item' in props && typeof props.item === 'object' ? props.item : (props as WizardItem<TValues>);

  const [active, setActive] = useState(0);
  const total = item.steps.length;
  const { isSubmitting } = useRNGContext();
  const { reset } = useFormContext();

  const next = () => setActive((current) => Math.min(current + 1, total - 1));
  const prev = () => setActive((current) => Math.max(current - 1, 0));
  const isLastStep = active === total - 1;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Text size="sm" fw={600}>
            Step {active + 1} of {total}
          </Text>
          <Text size="xs" c="dimmed">
            {Math.round(((active + 1) / total) * 100)}% complete
          </Text>
        </Group>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => reset()}
          disabled={isSubmitting}
          title="Reset Form"
        >
          <IconRefresh size={18} />
        </ActionIcon>
      </Group>

      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} size="sm">
        {item.steps.map((step, idx) => (
          <Stepper.Step key={idx} label={step.label} description={step.description}>
            <Stack gap="sm">
              {step.children.map((child, childIdx) => (
                <FieldWrapper key={child.type + childIdx} item={child as any} />
              ))}
            </Stack>
          </Stepper.Step>
        ))}
      </Stepper>

      <Group justify="space-between">
        <Button variant="light" onClick={prev} disabled={active === 0 || isSubmitting}>
          Previous
        </Button>
        {isLastStep ? (
          <Button type="submit" loading={isSubmitting}>
            Submit
          </Button>
        ) : (
          <Button onClick={next} disabled={isSubmitting}>
            Next
          </Button>
        )}
      </Group>
    </Stack>
  );
}
