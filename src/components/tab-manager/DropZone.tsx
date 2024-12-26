// components/DropZone.tsx
import React from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';

interface DropZoneProps {
  id: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const DropZone: React.FC<DropZoneProps> = ({ id, position }) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { type: 'dropZone', position },
  });

  const { active } = useDndContext();

  // Only show DropZone when dragging
  if (!active) {
    return null;
  }

  const positionStyles: { [key: string]: string } = {
    top: 'top-0 left-0 w-full h-1/2',
    bottom: 'bottom-0 left-0 w-full h-1/2',
    left: 'top-0 left-0 h-full w-1/2',
    right: 'top-0 right-0 h-full w-1/2',
    center: 'top-0 left-0 w-full h-full z-20',
  };

  return (
    <div
      ref={ setNodeRef }
      style={ {
        pointerEvents: isOver ? 'auto' : 'none',
        zIndex: isOver ? 10 : 1,
      } }
      className={ `absolute ${ positionStyles[position] }` }
    >
      { isOver  && (
        <div className="absolute inset-0 bg-sky-300/30 pointer-events-none rounded-lg"/>
      ) }
    </div>
  );
};

export default DropZone;
