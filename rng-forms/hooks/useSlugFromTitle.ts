'use client';

import { useEffect } from 'react';
import { useFormContext, useWatch, type FieldValues, type Path } from 'react-hook-form';
import { slugify } from '../utils/slugify';

/**
 * Syncs slug from title when override is false. Use with fieldTemplates.slugFromTitle().
 * Place as a child of RNGForm: <RNGForm><useSlugFromTitle titlePath="title" slugPath="slug" overridePath="overrideSlug" /></RNGForm>
 * or call the hook in a component that is a child of the form.
 */
export function useSlugFromTitle<TValues extends FieldValues>(
  titlePath: Path<TValues>,
  slugPath: Path<TValues>,
  overridePath?: Path<TValues>,
) {
  const { setValue, control } = useFormContext<TValues>();
  const title = useWatch({ control, name: titlePath });
  const override = overridePath ? useWatch({ control, name: overridePath }) : false;

  useEffect(() => {
    if (overridePath && override) return;
    const next = slugify(title);
    setValue(slugPath, next as any, { shouldDirty: true });
  }, [title, override, overridePath, slugPath, setValue]);
}

export default useSlugFromTitle;
