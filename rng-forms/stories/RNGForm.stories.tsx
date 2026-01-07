import type { Meta, StoryObj } from '@storybook/react';
import { globalLogger } from '../../lib';
import RNGForm from '../RNGForm';

const meta = {
  title: 'RNGForm/Complete Examples',
  component: RNGForm,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof RNGForm>;

export default meta;
type Story = StoryObj<typeof RNGForm>;

export const BasicTextInputs: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'text',
          name: 'firstName',
          label: 'First Name',
          placeholder: 'John',
          required: true,
        },
        {
          type: 'text',
          name: 'lastName',
          label: 'Last Name',
          placeholder: 'Doe',
          required: true,
        },
        {
          type: 'text',
          name: 'bio',
          label: 'Bio',
          placeholder: 'Tell us about yourself',
          multiline: true,
          rows: 4,
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Submitted:', data),
  },
};

export const TaxonomyFields: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'text',
          name: 'title',
          label: 'Title',
          placeholder: 'Enter title',
          required: true,
        },
        {
          type: 'taxonomy',
          name: 'categories',
          label: 'Categories',
          collection: 'categories',
          required: true,
        },
        {
          type: 'taxonomy',
          name: 'tags',
          label: 'Tags',
          collection: 'tags',
          placeholder: 'Add tags',
        },
        {
          type: 'taxonomy',
          name: 'departments',
          label: 'Departments',
          collection: 'departments',
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Taxonomy data:', data),
  },
};

export const SelectionInputs: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'select',
          name: 'country',
          label: 'Country',
          options: ['USA', 'UK', 'Canada', 'Australia'],
          required: true,
        },
        {
          type: 'select',
          name: 'interests',
          label: 'Interests',
          options: ['Sports', 'Music', 'Reading', 'Gaming', 'Cooking'],
          multiple: true,
          searchable: true,
        },
        {
          type: 'checkbox',
          name: 'terms',
          label: 'I agree to terms and conditions',
          required: true,
        },
        {
          type: 'switch',
          name: 'notifications',
          label: 'Enable Notifications',
          onLabel: 'On',
          offLabel: 'Off',
        },
        {
          type: 'radio',
          name: 'plan',
          label: 'Select Plan',
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Pro ($9/mo)', value: 'pro' },
            { label: 'Enterprise', value: 'enterprise' },
          ],
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Selection data:', data),
  },
};

export const DateAndTime: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'date',
          name: 'birthDate',
          label: 'Birth Date',
          required: true,
        },
        {
          type: 'date-range',
          name: 'vacationDates',
          label: 'Vacation Dates',
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Date data:', data),
  },
};

export const NumberInputs: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'number',
          name: 'age',
          label: 'Age',
          min: 0,
          max: 120,
          required: true,
        },
        {
          type: 'number',
          name: 'price',
          label: 'Price',
          min: 0,
          step: 0.01,
          placeholder: '0.00',
        },
        {
          type: 'slider',
          name: 'satisfaction',
          label: 'Satisfaction Level',
          min: 0,
          max: 10,
          step: 1,
          marks: [
            { value: 0, label: '0' },
            { value: 5, label: '5' },
            { value: 10, label: '10' },
          ],
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Number data:', data),
  },
};

export const SectionsAndLayout: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'section',
          title: 'Personal Information',
          description: 'Tell us about yourself',
          children: [
            {
              type: 'text',
              name: 'name',
              label: 'Full Name',
              required: true,
            },
            {
              type: 'text',
              name: 'email',
              label: 'Email',
              required: true,
            },
          ],
        },
        {
          type: 'section',
          title: 'Professional Details',
          collapsible: true,
          defaultOpened: true,
          children: [
            {
              type: 'text',
              name: 'company',
              label: 'Company',
            },
            {
              type: 'taxonomy',
              name: 'skills',
              label: 'Skills',
              collection: 'skills',
            },
          ],
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('Form data:', data),
  },
};

export const ComplexForm: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'section',
          title: 'Project Details',
          children: [
            {
              type: 'text',
              name: 'projectName',
              label: 'Project Name',
              required: true,
            },
            {
              type: 'text',
              name: 'description',
              label: 'Description',
              multiline: true,
              rows: 3,
            },
            {
              type: 'taxonomy',
              name: 'projectCategories',
              label: 'Categories',
              collection: 'categories',
            },
          ],
        },
        {
          type: 'section',
          title: 'Team & Resources',
          collapsible: true,
          defaultOpened: true,
          children: [
            {
              type: 'taxonomy',
              name: 'departments',
              label: 'Departments Involved',
              collection: 'departments',
              required: true,
            },
            {
              type: 'taxonomy',
              name: 'requiredSkills',
              label: 'Required Skills',
              collection: 'skills',
            },
            {
              type: 'date-range',
              name: 'timeline',
              label: 'Project Timeline',
            },
          ],
        },
        {
          type: 'section',
          title: 'Budget & Priority',
          collapsible: true,
          children: [
            {
              type: 'number',
              name: 'budget',
              label: 'Budget ($)',
              min: 0,
              step: 100,
            },
            {
              type: 'slider',
              name: 'priority',
              label: 'Priority Level',
              min: 1,
              max: 5,
              marks: [
                { value: 1, label: 'Low' },
                { value: 3, label: 'Medium' },
                { value: 5, label: 'High' },
              ],
            },
          ],
        },
      ],
    },
    onSubmit: (data: any) => {
      globalLogger.debug('Complex form submitted:', data);
      alert(JSON.stringify(data, null, 2));
    },
  },
};

export const AllFieldTypes: Story = {
  args: {
    schema: {
      items: [
        {
          type: 'section',
          title: 'Text Inputs',
          collapsible: true,
          defaultOpened: true,
          children: [
            { type: 'text', name: 'text', label: 'Text Field' },
            { type: 'password', name: 'password', label: 'Password' },
            { type: 'number', name: 'number', label: 'Number' },
            { type: 'color', name: 'color', label: 'Color Picker' },
          ],
        },
        {
          type: 'section',
          title: 'Selection Inputs',
          collapsible: true,
          children: [
            {
              type: 'select',
              name: 'select',
              label: 'Select',
              options: ['Option 1', 'Option 2', 'Option 3'],
            },
            { type: 'checkbox', name: 'checkbox', label: 'Checkbox' },
            { type: 'switch', name: 'switch', label: 'Switch' },
            {
              type: 'radio',
              name: 'radio',
              label: 'Radio',
              options: ['A', 'B', 'C'],
            },
          ],
        },
        {
          type: 'section',
          title: 'Taxonomy (New!)',
          collapsible: true,
          children: [
            {
              type: 'taxonomy',
              name: 'categories',
              label: 'Categories',
              collection: 'categories',
            },
            {
              type: 'taxonomy',
              name: 'tags',
              label: 'Tags',
              collection: 'tags',
            },
          ],
        },
        {
          type: 'section',
          title: 'Date & Time',
          collapsible: true,
          children: [
            { type: 'date', name: 'date', label: 'Date' },
            { type: 'date-range', name: 'dateRange', label: 'Date Range' },
          ],
        },
      ],
    },
    onSubmit: (data: any) => globalLogger.debug('All fields:', data),
  },
};
