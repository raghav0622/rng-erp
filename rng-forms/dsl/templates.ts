/**
 * Field Templates - Reusable patterns for common form fields
 */

export const fieldTemplates = {
  /**
   * Standard name fields (First Name, Last Name)
   */
  fullName: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'firstName' as any,
        label: 'First Name',
        required: true,
        validation: {
          minLength: { value: 2, message: 'First name must be at least 2 characters' },
          maxLength: { value: 50, message: 'First name must not exceed 50 characters' },
          pattern: {
            value: /^[a-zA-Z\s-']+$/,
            message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
          },
        },
      } as any,
      {
        type: 'text',
        name: 'lastName' as any,
        label: 'Last Name',
        required: true,
        validation: {
          minLength: { value: 2, message: 'Last name must be at least 2 characters' },
          maxLength: { value: 50, message: 'Last name must not exceed 50 characters' },
          pattern: {
            value: /^[a-zA-Z\s-']+$/,
            message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
          },
        },
      } as any,
    ],
  }),

  /**
   * Email and phone contact fields
   */
  contactInfo: (): any => ({
    type: 'group',
    children: [
      {
        type: 'email',
        name: 'email' as any,
        label: 'Email Address',
        required: true,
        validation: {
          pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Please enter a valid email address',
          },
        },
      } as any,
      {
        type: 'tel',
        name: 'phone' as any,
        label: 'Phone Number',
        placeholder: '(555) 123-4567',
        validation: {
          pattern: {
            value: /^[\d\s\-()+]+$/,
            message: 'Please enter a valid phone number',
          },
        },
      } as any,
    ],
  }),

  /**
   * Complete address block
   */
  address: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'address.street' as any,
        label: 'Street Address',
        required: true,
        placeholder: '123 Main St',
      } as any,
      {
        type: 'text',
        name: 'address.apartment' as any,
        label: 'Apartment, suite, etc.',
        placeholder: 'Apt 4B',
      } as any,
      {
        type: 'group',
        children: [
          {
            type: 'text',
            name: 'address.city' as any,
            label: 'City',
            required: true,
          } as any,
          {
            type: 'select',
            name: 'address.state' as any,
            label: 'State',
            required: true,
            options: [
              { value: 'AL', label: 'Alabama' },
              { value: 'AK', label: 'Alaska' },
              { value: 'AZ', label: 'Arizona' },
              { value: 'AR', label: 'Arkansas' },
              { value: 'CA', label: 'California' },
              { value: 'CO', label: 'Colorado' },
              { value: 'CT', label: 'Connecticut' },
              { value: 'DE', label: 'Delaware' },
              { value: 'FL', label: 'Florida' },
              { value: 'GA', label: 'Georgia' },
            ],
          } as any,
          {
            type: 'text',
            name: 'address.zipCode' as any,
            label: 'ZIP Code',
            required: true,
            validation: {
              pattern: {
                value: /^\d{5}(-\d{4})?$/,
                message: 'Please enter a valid ZIP code',
              },
            },
          } as any,
        ],
      } as any,
    ],
  }),

  /**
   * Date range fields (start and end date)
   */
  dateRange: (
    startName: string = 'startDate',
    endName: string = 'endDate',
    startLabel: string = 'Start Date',
    endLabel: string = 'End Date',
  ): any => ({
    type: 'group',
    children: [
      {
        type: 'date',
        name: startName as any,
        label: startLabel,
        required: true,
      } as any,
      {
        type: 'date',
        name: endName as any,
        label: endLabel,
        required: true,
        validation: {
          validate: {
            afterStart: (value: any, formValues: any) => {
              const start = formValues[startName];
              if (!start || !value) return true;
              return new Date(value) >= new Date(start) || 'End date must be after start date';
            },
          },
        },
      } as any,
    ],
  }),

  /**
   * Social media links
   */
  socialMedia: (): any => ({
    type: 'group',
    children: [
      {
        type: 'url' as any,
        name: 'social.twitter' as any,
        label: 'Twitter',
        placeholder: 'https://twitter.com/username',
      } as any,
      {
        type: 'url',
        name: 'social.linkedin' as any,
        label: 'LinkedIn',
        placeholder: 'https://linkedin.com/in/username',
      } as any,
      {
        type: 'url',
        name: 'social.github' as any,
        label: 'GitHub',
        placeholder: 'https://github.com/username',
      } as any,
      {
        type: 'url',
        name: 'social.website' as any,
        label: 'Website',
        placeholder: 'https://example.com',
      } as any,
    ],
  }),

  /**
   * Credit card fields
   */
  creditCard: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'card.number' as any,
        label: 'Card Number',
        required: true,
        placeholder: '1234 5678 9012 3456',
        validation: {
          pattern: {
            value: /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/,
            message: 'Please enter a valid card number',
          },
        },
      } as any,
      {
        type: 'text',
        name: 'card.name' as any,
        label: 'Name on Card',
        required: true,
      } as any,
      {
        type: 'group',
        children: [
          {
            type: 'text',
            name: 'card.expiry' as any,
            label: 'Expiry Date',
            required: true,
            placeholder: 'MM/YY',
            validation: {
              pattern: {
                value: /^(0[1-9]|1[0-2])\/\d{2}$/,
                message: 'Please enter a valid expiry date (MM/YY)',
              },
            },
          } as any,
          {
            type: 'password' as any,
            name: 'card.cvv' as any,
            label: 'CVV',
            required: true,
            placeholder: '123',
            validation: {
              pattern: {
                value: /^\d{3,4}$/,
                message: 'Please enter a valid CVV',
              },
            },
          } as any,
        ],
      } as any,
    ],
  }),

  /**
   * Password with confirmation
   */
  passwordWithConfirmation: (
    passwordName: string = 'password',
    confirmName: string = 'confirmPassword',
  ): any => ({
    type: 'group',
    children: [
      {
        type: 'password' as any,
        name: passwordName as any,
        label: 'Password',
        required: true,
        validation: {
          minLength: { value: 8, message: 'Password must be at least 8 characters' },
          pattern: {
            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            message: 'Password must contain uppercase, lowercase, number, and special character',
          },
        },
      } as any,
      {
        type: 'password' as any,
        name: confirmName as any,
        label: 'Confirm Password',
        required: true,
        validation: {
          validate: {
            matches: (value: any, formValues: any) => {
              const password = formValues[passwordName];
              return value === password || 'Passwords do not match';
            },
          },
        },
      } as any,
    ],
  }),

  /**
   * Emergency contact information
   */
  emergencyContact: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'emergencyContact.name' as any,
        label: 'Emergency Contact Name',
        required: true,
      } as any,
      {
        type: 'text',
        name: 'emergencyContact.relationship' as any,
        label: 'Relationship',
        required: true,
        placeholder: 'e.g., Spouse, Parent, Sibling',
      } as any,
      {
        type: 'group',
        children: [
          {
            type: 'tel' as any,
            name: 'emergencyContact.phone' as any,
            label: 'Phone Number',
            required: true,
          } as any,
          {
            type: 'email' as any,
            name: 'emergencyContact.email' as any,
            label: 'Email Address',
          } as any,
        ],
      } as any,
    ],
  }),

  /**
   * Company/Organization information
   */
  companyInfo: (): any => ({
    type: 'group',
    children: [
      {
        type: 'text',
        name: 'company.name' as any,
        label: 'Company Name',
        required: true,
      } as any,
      {
        type: 'group',
        children: [
          {
            type: 'text',
            name: 'company.taxId' as any,
            label: 'Tax ID / EIN',
            placeholder: '12-3456789',
          } as any,
          {
            type: 'url' as any,
            name: 'company.website' as any,
            label: 'Website',
            placeholder: 'https://example.com',
          } as any,
        ],
      } as any,
    ],
  }),

  /**
   * Time range (hours and minutes)
   */
  timeRange: (
    startName: string = 'startTime',
    endName: string = 'endTime',
    startLabel: string = 'Start Time',
    endLabel: string = 'End Time',
  ): any => ({
    type: 'group',
    children: [
      {
        type: 'time',
        name: startName as any,
        label: startLabel,
        required: true,
      } as any,
      {
        type: 'time',
        name: endName as any,
        label: endLabel,
        required: true,
      } as any,
    ],
  }),

  /**
   * Cascading (dependent) selects: parent value drives child options.
   * Parent options: static array or () => Promise<Option[]>.
   * getChildOptions: (parentValue: string | undefined) => Promise<Option[]>.
   * Child has dependencies and optionsDependencies on parent so it re-renders and re-fetches when parent changes.
   */
  cascadingSelect: (
    parentName: string,
    childName: string,
    parentLabel: string = 'Parent',
    childLabel: string = 'Child',
    parentOptions:
      | string[]
      | { label: string; value: string }[]
      | (() => Promise<{ label: string; value: string }[]>),
    getChildOptions: (parentValue: string | undefined) => Promise<{ label: string; value: string }[]>,
  ): any => ({
    type: 'group',
    children: [
      {
        type: 'select',
        name: parentName as any,
        label: parentLabel,
        options: parentOptions,
      } as any,
      {
        type: 'select',
        name: childName as any,
        label: childLabel,
        dependencies: [parentName],
        options: (getValues: () => any) => getChildOptions(getValues()?.[parentName]),
        optionsDependencies: [parentName],
      } as any,
    ],
  }),

  /**
   * Title + optional "Edit slug manually" checkbox + slug. Use useSlugFromTitle(titlePath, slugPath, overridePath) in a child of RNGForm to sync slug from title when override is unchecked.
   */
  slugFromTitle: (
    titleName: string = 'title',
    slugName: string = 'slug',
    overrideName: string = 'overrideSlug',
    titleLabel: string = 'Title',
    slugLabel: string = 'Slug',
    overrideLabel: string = 'Edit slug manually',
  ): any => ({
    type: 'group',
    children: [
      { type: 'text', name: titleName as any, label: titleLabel, required: true } as any,
      {
        type: 'checkbox',
        name: overrideName as any,
        label: overrideLabel,
      } as any,
      {
        type: 'text',
        name: slugName as any,
        label: slugLabel,
        dependencies: [titleName, overrideName],
        propsLogic: (_scope: any, root: any) => ({
          disabled: root[overrideName] !== true,
        }),
      } as any,
    ],
  }),

  /**
   * Country code select + phone (tel) input. Pass options for country codes (e.g. [{ value: '+91', label: 'India +91' }, { value: '+1', label: 'US +1' }]).
   */
  phoneWithCountryCode: (
    phoneName: string = 'phone',
    countryCodeName: string = 'countryCode',
    phoneLabel: string = 'Phone',
    countryCodeLabel: string = 'Country',
    countryCodeOptions: { label: string; value: string }[] = [
      { value: '+91', label: 'India +91' },
      { value: '+1', label: 'US +1' },
      { value: '+44', label: 'UK +44' },
    ],
  ): any => ({
    type: 'group',
    children: [
      {
        type: 'select',
        name: countryCodeName as any,
        label: countryCodeLabel,
        options: countryCodeOptions,
      } as any,
      {
        type: 'tel',
        name: phoneName as any,
        label: phoneLabel,
        placeholder: 'Number without country code',
      } as any,
    ],
  }),

  /**
   * Single select/autocomplete with async options. Options load via the provided function (loading state shown by the component).
   */
  asyncSelect: (
    name: string,
    fetchOptions: () => Promise<{ label: string; value: string }[]>,
    label?: string,
    placeholder?: string,
    searchable: boolean = true,
  ): any => ({
    type: 'select',
    name: name as any,
    label: label ?? name,
    placeholder: placeholder ?? 'Loading…',
    options: fetchOptions,
    searchable,
  } as any),

  asyncAutocomplete: (
    name: string,
    fetchOptions: () => Promise<{ label: string; value: string }[]>,
    label?: string,
    placeholder?: string,
  ): any => ({
    type: 'autocomplete',
    name: name as any,
    label: label ?? name,
    placeholder: placeholder ?? 'Loading…',
    options: fetchOptions,
  } as any),
};

/**
 * Helper function to create a custom template
 */
export function createFieldTemplate(fields: any[], columns: number = 1): any {
  return {
    type: 'group',
    children: fields,
  };
}
