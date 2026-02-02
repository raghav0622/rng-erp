'use client'; // Required if using Next.js App Router (app directory)

import React, { useRef } from 'react';
import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer';

// Define strict props interface
interface PanoramaViewerProps {
  imageSrc: string;
}

const PanoramaViewer: React.FC<PanoramaViewerProps> = ({ imageSrc }) => {
  // We use 'any' for the ref here because the library's ref instance type
  // can be complex depending on version, but it generally refers to the Viewer instance.
  const psvRef = useRef<any>(null);

  return (
    <ReactPhotoSphereViewer
      ref={psvRef}
      src={imageSrc}
      height="100%"
      width="100%"
      container=""
      // Options are passed as props in the React wrapper
      navbar={['zoom', 'move', 'download', 'fullscreen']}
      mousewheel={true}
      mousemove={true}
      moveSpeed={1}
      zoomSpeed={1}
      defaultZoomLvl={50}
    />
  );
};

export default PanoramaViewer;
