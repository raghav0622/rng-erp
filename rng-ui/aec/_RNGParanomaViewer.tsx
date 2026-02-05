'use client';

import React, { useRef } from 'react';
import { ReactPhotoSphereViewer } from 'react-photo-sphere-viewer';

interface RNGPanoramaViewerProps {
  imageSrc: string;
}

export const RNGPanoramaViewer: React.FC<RNGPanoramaViewerProps> = ({ imageSrc }) => {
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
