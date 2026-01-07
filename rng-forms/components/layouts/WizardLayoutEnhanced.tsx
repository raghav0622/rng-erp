'use client';

import { Badge, Button, Group, Progress, Stack, Stepper, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { WizardItem } from '../../types/core';

export default function WizardLayoutEnhanced<TValues>(
  props: WizardItem<TValues> | { item: WizardItem<TValues> },
) {
  const item =
    'item' in props && typeof props.item === 'object' ? props.item : (props as WizardItem<TValues>);

  const [active, setActive] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { trigger, formState } = useFormContext();
  const total = item.steps.length;

  // Get field names for current step
  const getCurrentStepFields = (stepIndex: number): string[] => {
    const step = item.steps[stepIndex];
    const fieldNames: string[] = [];

    if (!step || !step.children) return fieldNames;

    const extractFieldNames = (children: any[]) => {
      children.forEach((child) => {
        if ('name' in child && child.name) {
          fieldNames.push(child.name);
        }
        if (child.type === 'group' && child.children) {
          extractFieldNames(child.children);
        }
        if (child.type === 'section' && child.children) {
          extractFieldNames(child.children);
        }
      });
      ('use client');
    };

    return fieldNames;
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldNames = getCurrentStepFields(active);
    if (fieldNames.length === 0) return true;

    try {
      const result = await trigger(fieldNames as any);
      return result;
    } catch {
      return false;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();

    if (isValid) {
      setCompletedSteps((prev) => new Set(prev).add(active));
      setActive((current) => Math.min(current + 1, total - 1));
    }
  };

  const handlePrevious = () => {
    setActive((current) => Math.max(current - 1, 0));
  };

  const handleStepClick = async (stepIndex: number) => {
    // Can only go to previous steps or next step if current is valid
    if (stepIndex < active) {
      setActive(stepIndex);
    } else if (stepIndex === active + 1) {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCompletedSteps((prev) => new Set(prev).add(active));
        setActive(stepIndex);
      }
    }
  };

  const currentStepFields = getCurrentStepFields(active);
  const currentStepErrors = currentStepFields.filter(
    (field) => formState.errors[field as keyof typeof formState.errors],
  );
  const hasErrors = currentStepErrors.length > 0;

  const progress = total > 0 ? Math.round(((active + 1) / total) * 100) : 0;
  const isLastStep = active === total - 1;
  const isFirstStep = active === 0;

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Step {active + 1} of {total}
          </Text>
          <Badge variant="light" color={progress === 100 ? 'green' : 'blue'}>
            {progress}% Complete
          </Badge>
        </Group>
        <Progress value={progress} size="sm" radius="xl" />
      </Stack>

      <Stepper active={active} onStepClick={handleStepClick} allowNextStepsSelect={false} size="sm">
        {item.steps.map((step, idx) => {
          const isCompleted = completedSteps.has(idx) || idx < active;

          return (
            <Stepper.Step
              key={idx}
              label={step.label}
              description={step.description}
              icon={isCompleted ? <IconCheck size={16} /> : undefined}
              color={isCompleted ? 'green' : undefined}
              allowStepSelect={idx <= active}
            >
              <Stack gap="md" mt="md">
                {step.children.map((child: any, childIdx: number) => (
                  <FieldWrapper key={`${idx}-${childIdx}`} item={child} />
                ))}
              </Stack>
            </Stepper.Step>
          );
        })}
      </Stepper>

      {hasErrors && (
        <Text size="sm" c="red">
          Please fix {currentStepErrors.length} error{currentStepErrors.length > 1 ? 's' : ''}{' '}
          before continuing
        </Text>
      )}

      <Group justify="space-between" mt="md">
        <Button variant="subtle" onClick={handlePrevious} disabled={isFirstStep}>
          Previous
        </Button>
        <Button onClick={handleNext} disabled={isLastStep}>
          {isLastStep ? 'Complete' : 'Next'}
        </Button>
      </Group>
    </Stack>
  );
}
