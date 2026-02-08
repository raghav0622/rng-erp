'use client';

import { RNGForm } from '@/rng-forms';
import type { RNGFormSchema } from '@/rng-forms/types/core';
import { Container, Paper, Stack, Text, Title } from '@mantine/core';
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
      title: 'Taxonomy Demo Form',
      description: 'Try the self-learning taxonomy feature - type new values to create them',
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

export default function TaxonomyDemo() {
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
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Taxonomy Learning Form</Title>
          <Text c="dimmed" mt="xs">
            This form demonstrates the self-learning taxonomy feature. Type new values to create
            them automatically - they'll appear in the Taxonomy Management dashboard for review and
            deletion.
          </Text>
        </div>

        <Paper withBorder p="md" radius="md">
          <RNGForm<SampleFormValues>
            schema={SAMPLE_FORM_SCHEMA}
            validationSchema={VALIDATION_SCHEMA}
            onSubmit={handleSubmit}
            submitLabel={isSubmitting ? 'Submitting...' : 'Submit'}
          />
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
              <Text size="sm" c="dimmed">
                The values have been recorded in the taxonomy system.
              </Text>
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
    </Container>
  );
}
