'use client';

import { RNGForm } from '@/rng-forms';
import type { RNGFormSchema } from '@/rng-forms/types/core';
import { Paper, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { z } from 'zod';

interface SampleFormValues {
  propertyType: string;
  projectStatus: string;
}

const SAMPLE_FORM_SCHEMA: RNGFormSchema<SampleFormValues> = {
  items: [
    {
      type: 'section',
      title: 'Sample Taxonomy Form',
      description: 'This demonstrates the self-learning taxonomy feature',
      collapsible: false,
      children: [
        {
          type: 'taxonomy',
          name: 'propertyType',
          taxonomy: 'property_type',
          label: 'Property Type',
          description: 'Select or type to create a new property type',
          placeholder: 'e.g., Residential, Commercial, Industrial',
          required: true,
        },
        {
          type: 'taxonomy',
          name: 'projectStatus',
          taxonomy: 'project_status',
          label: 'Project Status',
          description: 'Select or type to create a new project status',
          placeholder: 'e.g., Planning, In Progress, Completed',
          required: true,
        },
      ],
    },
  ],
};

const VALIDATION_SCHEMA = z.object({
  propertyType: z.string().min(1, 'Property type is required'),
  projectStatus: z.string().min(1, 'Project status is required'),
});

export function SampleTaxonomyForm() {
  const [submittedValues, setSubmittedValues] = useState<SampleFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: SampleFormValues) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSubmittedValues(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack gap="lg">
      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <div>
            <Title order={4}>Try It Out</Title>
            <Text size="sm" c="dimmed">
              Type new values to create them automatically. They'll appear in the management table
              and can be reused across forms.
            </Text>
          </div>

          <RNGForm<SampleFormValues>
            schema={SAMPLE_FORM_SCHEMA}
            validationSchema={VALIDATION_SCHEMA}
            onSubmit={handleSubmit}
            submitLabel={isSubmitting ? 'Submitting...' : 'Submit'}
          />
        </Stack>
      </Paper>

      {submittedValues && (
        <Paper
          withBorder
          p="md"
          radius="md"
          bg="green.0"
          bd="1px solid var(--mantine-color-green-3)"
        >
          <Stack gap="sm">
            <Title order={5} c="green">
              ✓ Form Submitted Successfully
            </Title>
            <Stack gap="xs">
              <div>
                <Text size="sm" fw={500}>
                  Property Type:
                </Text>
                <Text size="sm" c="dimmed">
                  {submittedValues.propertyType}
                </Text>
              </div>
              <div>
                <Text size="sm" fw={500}>
                  Project Status:
                </Text>
                <Text size="sm" c="dimmed">
                  {submittedValues.projectStatus}
                </Text>
              </div>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
