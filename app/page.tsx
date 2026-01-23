'use client';

import ParanomaViewer from './ParanomaViewer';
export default function Page() {
  return (
    <div style={{ height: 450, width: 900 }}>
      <ParanomaViewer imageSrc="/test.jpeg" />
    </div>
  );
}
