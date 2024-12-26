// components/Tab.tsx
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { TabType } from '@/types';

interface TabProps {
  tab: TabType;
  isActive: boolean;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

const TabHeader: React.FC<TabProps> = React.memo(({
                                                    tab,
                                                    isActive,
                                                    onSelect,
                                                    // onClose,
                                                  }) => {
  const { attributes, listeners, setNodeRef: setDraggableRef, transform } =
    useDraggable({
      id: tab.id,
      data: { type: 'tab', tab },
    });

  const style = {
    transform: transform
      ? `translate(${ transform.x }px, ${ transform.y }px)`
      : undefined,
  };

  return (
    <div
      ref={ setDraggableRef }
      style={ style }
      { ...attributes }
      { ...listeners }
      className={ `mx-1 my-2 px-3 py-1 cursor-pointer flex items-center rounded-lg z-10 ${
        isActive ? 'bg-amber-500 text-white' : 'bg-gray-200 text-black'
      }` }
      onClick={ () => onSelect(tab.id) }
    >
      { tab.label }
      {/*{ tab.closeable && (
        <button
          onClick={ (e) => {
            e.stopPropagation();
            onClose(tab.id);
          } }
          className="ml-2 text-white text-xl"
        >
          ✕
        </button>
      ) }*/}
    </div>
  );
});

TabHeader.displayName = 'TabHeader';
export default TabHeader;
