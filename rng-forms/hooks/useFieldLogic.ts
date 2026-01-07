'use client';

import { useMemo } from 'react';
import { useFormContext, useWatch, type FieldValues } from 'react-hook-form';
import type { RNGFormItem } from '../types/core';

function buildDependencyNames(dependencies: string[], scopePrefix: string): string[] {
  const set = new Set<string>();
  dependencies.forEach((dep) => {
    const isRoot = dep.startsWith('!');
    const raw = isRoot ? dep.slice(1) : dep;
    if (raw) set.add(raw);
    if (!isRoot && scopePrefix) {
      set.add(`${scopePrefix}.${raw}`);
    }
  });
  return Array.from(set);
}

export function useFieldLogic<TValues extends FieldValues = FieldValues>(
  item: RNGFormItem<TValues>,
) {
  const form = useFormContext<TValues>();
  const dependencies =
    'dependencies' in item && Array.isArray((item as any).dependencies)
      ? ((item as any).dependencies as string[])
      : [];

  const scopePath = 'name' in item ? (item as any).name?.toString() : '';
  const explicitPrefix = 'scopePrefix' in item ? (item as any).scopePrefix || '' : '';
  const derivedPrefix =
    scopePath && scopePath.includes('.') ? scopePath.split('.').slice(0, -1).join('.') : '';
  const scopePrefix = explicitPrefix || derivedPrefix;

  const namesToWatch = buildDependencyNames(dependencies, scopePrefix);

  // Watch declared dependencies (raw + scoped variants) to minimize re-renders
  useWatch<TValues>({
    control: form.control,
    name: namesToWatch.length ? (namesToWatch as any) : undefined,
  });

  const rootValues = form.getValues();
  const scopeValues = scopePath ? form.getValues(scopePath as any) ?? rootValues : rootValues;

  const isVisible = useMemo(() => {
    return 'renderLogic' in item && item.renderLogic
      ? item.renderLogic(scopeValues as TValues, rootValues as TValues)
      : true;
  }, [item, rootValues, scopeValues]);

  const dynamicProps = useMemo(() => {
    return 'propsLogic' in item && item.propsLogic
      ? item.propsLogic(scopeValues as TValues, rootValues as TValues)
      : {};
  }, [item, rootValues, scopeValues]);

  return { isVisible, dynamicProps } as const;
}

export default useFieldLogic;
