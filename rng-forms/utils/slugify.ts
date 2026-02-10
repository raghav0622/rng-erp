/**
 * Simple slugify: lowercase, replace spaces/slashes with hyphen, remove non-alphanumeric.
 */
export function slugify(value: string | null | undefined): string {
  if (value == null || typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
