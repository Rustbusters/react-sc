import { useDroppable } from "@dnd-kit/core";

const InterstitialDropZone: React.FC<{ stackId: string; position: number }> = ({
                                                                                 stackId,
                                                                                 position,
                                                                               }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone-${ stackId }-${ position }`,
    data: { type: 'interstitial-dropZone', stackId, position },
  });

  return (
    <div
      ref={ setNodeRef }
      style={ {
        pointerEvents: isOver ? 'auto' : 'none',
        zIndex: isOver ? 10 : 1,
      } }
      className={ `h-full w-2 bg-transparent ${ isOver ? 'bg-blue-300' : '' }` }
    >
      { isOver && <div className="absolute inset-0 bg-sky-300/30 rounded-lg"/> }
    </div>
  );
};

export default InterstitialDropZone;
