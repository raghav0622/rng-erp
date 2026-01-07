import { z } from 'zod';

export const fruitOptions = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Dragonfruit', value: 'dragonfruit' },
];

export const countryOptions = [
  { label: 'USA', value: 'usa' },
  { label: 'India', value: 'india' },
  { label: 'Germany', value: 'germany' },
  { label: 'Japan', value: 'japan' },
];

export const asyncCityOptions = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [
    { label: 'San Francisco', value: 'sf' },
    { label: 'New York', value: 'nyc' },
    { label: 'Mumbai', value: 'bom' },
    { label: 'Berlin', value: 'ber' },
  ];
};

export function createMockFile(name = 'demo.txt', type = 'text/plain', size = 256): File {
  const content = 'x'.repeat(size);
  return new File([content], name, { type });
}

export const geoDefaults = {
  defaultCenter: { lat: 37.7749, lng: -122.4194 },
  zoom: 11,
};

export const basePersonSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().min(0).max(120),
});
