import { Grid, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { DatesProvider } from '@mantine/dates';
import '@mantine/dates/styles.css';
import '@mantine/tiptap/styles.css';
import type { Decorator, Preview } from '@storybook/react';
import { theme } from '../theme';

export const parameters: Preview['parameters'] = {
  // Explicit empty actions prevents the visual-test addon warning
  // (don't rely on argTypesRegex when using visual tests)
  actions: {},
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  layout: 'padded',
  a11y: {
    test: 'todo',
  },
};

const withMantineProviders: Decorator = (Story) => (
  <DatesProvider settings={{ locale: 'en' }}>
    <MantineProvider theme={theme}>
      <Grid gutter="md" style={{ padding: 24 }}>
        <Grid.Col span={{ base: 12, md: 10 }}>
          <Story />
        </Grid.Col>
      </Grid>
    </MantineProvider>
  </DatesProvider>
);

export const decorators: Preview['decorators'] = [withMantineProviders];

const preview: Preview = { parameters, decorators };

export default preview;
