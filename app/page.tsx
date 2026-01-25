'use client';

import { useCreateTaxonomy, useListTaxonomies } from '@/rng-platform';
import { Button } from '@mantine/core';
// import ParanomaViewer from './ParanomaViewer';
export default function Page() {
  const taxonomies = useListTaxonomies();
  const { mutateAsync } = useCreateTaxonomy();

  console.log(taxonomies.data);
  // Simple random string generator
  function randomString(length = 8) {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  return (
    <div style={{ height: 450, width: 900 }}>
      <Button
        onClick={async () => {
          await mutateAsync({
            name: `Taxonomy-${randomString(6)}`,
            description: `Description ${randomString(12)}`,
          });
        }}
      >
        Add Test Taxonomy
      </Button>
      {/* <ParanomaViewer imageSrc="/test.jpeg" /> */}
    </div>
  );
}
