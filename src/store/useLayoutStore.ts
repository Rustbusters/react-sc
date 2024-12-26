// store/useLayoutStore.ts
import { create } from 'zustand';
import { NodeTreeTabsType } from '@/types';
import {
  closeTab,
  moveTabIntoNewSplitted,
  moveTabToStack,
  moveTabToStackAtIndex,
  updateActiveTab,
} from '@/lib/helpers';

interface LayoutState {
  layout: NodeTreeTabsType;
  setLayout: (updater: (draft: NodeTreeTabsType) => void) => void;

  // Esempio di azioni che verranno usate dal tuo componente:
  handleTabSelect: (stackId: string, tabId: string) => void;
  handleTabClose: (stackId: string, tabId: string) => void;
  handleMoveTabToNewStack: (tabId: string, targetStackId: string) => void;
  handleMoveTabInNewSplittedTabs: (
    tabId: string,
    targetSplitId: string,
    position: 'top' | 'bottom' | 'left' | 'right'
  ) => void;
  handleMoveTabToNewStackNew: (
    tabId: string,
    targetStackId: string,
    position: number
  ) => void;
}

// Qui potresti mettere la tua configurazione di layout iniziale
const initialLayout: NodeTreeTabsType = {
  type: 'splittedTabs',
  id: 'root',
  direction: 'horizontal',
  nodeTreeTabs: [
    {
      type: 'tabStack',
      id: 'stack1',
      tabs: [
        {
          id: 'tab1',
          label: 'Tab 1',
          componentId: 'tab1Component',
          closeable: true,
        },
        {
          id: 'tab2',
          label: 'Tab 2',
          componentId: 'tab2Component',
          closeable: true,
        },
      ],
      activeTabIndex: 1,
    },
    {
      type: 'splittedTabs',
      id: 'split1',
      direction: 'vertical',
      nodeTreeTabs: [
        {
          type: 'tabStack',
          id: 'stack2',
          tabs: [
            {
              id: 'tab3',
              label: 'Tab 3',
              componentId: 'tab3Component',
              closeable: true,
            },
            {
              id: 'tab4',
              label: 'Tab 4',
              componentId: 'graphComponent',
              closeable: true,
            },
          ],
          activeTabIndex: 1,
        },
        {
          type: 'tabStack',
          id: 'stack3',
          tabs: [
            {
              id: 'tab5',
              label: 'Tab 5',
              componentId: 'controlPanelComponent',
              closeable: true,
            },
          ],
          activeTabIndex: 0,
        },
      ],
      splitPercentages: [50, 50],
    },
  ],
  splitPercentages: [50, 50],
};

export const useLayoutStore = create<LayoutState>((set, get) => ({
  // Initial state
  layout: initialLayout,

  // setLayout ci permette di fare un update immutabile
  setLayout: (updater) => {
    set((state) => {
      const newLayout = structuredClone(state.layout);
      updater(newLayout);
      return { layout: newLayout };
    });
  },

  // Azioni
  handleTabSelect: (stackId, tabId) => {
    get().setLayout((draft) => {
      updateActiveTab(draft, stackId, tabId);
    });
  },

  handleTabClose: (stackId, tabId) => {
    get().setLayout((draft) => {
      closeTab(draft, stackId, tabId);
    });
  },

  handleMoveTabToNewStack: (tabId, targetStackId) => {
    get().setLayout((draft) => {
      moveTabToStack(draft, tabId, targetStackId);
    });
  },

  handleMoveTabInNewSplittedTabs: (tabId, targetSplitId, position) => {
    get().setLayout((draft) => {
      moveTabIntoNewSplitted(draft, tabId, targetSplitId, position);
    });
  },

  handleMoveTabToNewStackNew: (tabId, targetStackId, position) => {
    get().setLayout((draft) => {
      moveTabToStackAtIndex(draft, tabId, targetStackId, position);
    });
  },
}));
