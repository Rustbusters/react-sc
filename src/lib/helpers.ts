// helpers.ts
import { NodeTreeTabsType, SplittedTabsType, TabStackType, TabType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// FIXME: nella remove devo settare un nuovo activeTabIndex se quello attuale è maggiore o uguale alla lunghezza delle tabs

// TODO: controllare se la tab che voglio spostare è già all'interno della tabStack di destinazione

export const updateActiveTab = (
  node: NodeTreeTabsType,
  stackId: string,
  tabId: string
): void => {
  if (node.type === 'tabStack' && node.id === stackId) {
    const tabIndex = node.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex !== -1) {
      node.activeTabIndex = tabIndex;
    }
  } else if (node.type === 'splittedTabs') {
    node.nodeTreeTabs.forEach((child) => updateActiveTab(child, stackId, tabId));
  }
};

export const closeTab = (
  node: NodeTreeTabsType,
  stackId: string,
  tabId: string
): boolean => {
  if (node.type === 'tabStack' && node.id === stackId) {
    const tabIndex = node.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex !== -1) {
      node.tabs.splice(tabIndex, 1);
      if (node.activeTabIndex && node.activeTabIndex >= node.tabs.length) {
        node.activeTabIndex = node.tabs.length - 1;
      }
      return node.tabs.length === 0;
    }
  } else if (node.type === 'splittedTabs') {
    for (let i = 0; i < node.nodeTreeTabs.length; i++) {
      const child = node.nodeTreeTabs[i];
      const isEmpty = closeTab(child, stackId, tabId);
      if (isEmpty) {
        node.nodeTreeTabs.splice(i, 1);
        node.splitPercentages.splice(i, 1);
        simplifySplittedTabs(node);
        i--;
      }
    }
  }
  return false;
};


export const customMoveTabToNewStack = (
  root: NodeTreeTabsType,
  tabId: string,
  targetStackId: string
): void => {
  console.log('customMoveTabToNewStack', root, tabId, targetStackId);


  const tabToMove = findRemoveAndSemplify(root, tabId);

  if (tabToMove) {
    const addTabToStack = (node: NodeTreeTabsType): boolean => {
      if (node.type === 'tabStack' && node.id === targetStackId) {
        node.tabs.push(tabToMove);
        node.activeTabIndex = node.tabs.length - 1;
        return true;
      } else if (node.type === 'splittedTabs') {
        return node.nodeTreeTabs.some(addTabToStack);
      }
      return false;
    };

    addTabToStack(root);
  }
};

const findRemoveAndSemplify = (node: NodeTreeTabsType, tabId: string): TabType | null => {

  if (node.type === 'tabStack') { /// return tab if found, otherwise null
    const tabIndex = node.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex !== -1) {
      node.activeTabIndex = tabIndex - 1 > 0 ? tabIndex - 1 : 0;

      return node.tabs.splice(tabIndex, 1)[0];
    }
  } else if (node.type === 'splittedTabs') {

    for (let i = 0; i < node.nodeTreeTabs.length; i++) {

      const removedTab = findRemoveAndSemplify(node.nodeTreeTabs[i], tabId);

      if (removedTab) {
        if (node.nodeTreeTabs[i].type === 'tabStack' && (node.nodeTreeTabs[i] as TabStackType).tabs.length === 0) {
          node.nodeTreeTabs.splice(i, 1);
          if (node.nodeTreeTabs.length > 0) { // Se ci sono ancora figli
            node.splitPercentages = Array(node.nodeTreeTabs.length).fill(100 / node.nodeTreeTabs.length);
          } else {
            node.splitPercentages = [];
          }
        } else if (node.nodeTreeTabs[i].type === 'splittedTabs' && (node.nodeTreeTabs[i] as SplittedTabsType).nodeTreeTabs.length === 0) {
          node.nodeTreeTabs.splice(i, 1);
          if (node.nodeTreeTabs.length > 0) { // Se ci sono ancora figli
            node.splitPercentages = Array(node.nodeTreeTabs.length).fill(100 / node.nodeTreeTabs.length);
          } else {
            node.splitPercentages = [];
          }
        }
        return removedTab;
      }
    }
    // TODO: Think how to simplify the splittedTabs
  }

  return null;
}

export const customMoveTabInNewSplittedTabs = (
  root: NodeTreeTabsType,
  tabId: string,
  targetSplitId: string,
  position: 'top' | 'bottom' | 'left' | 'right'
): void => {

  const tabToMove = findRemoveAndSemplify(root, tabId);

  if (tabToMove) {
    const addTabToSplit = (node: NodeTreeTabsType): boolean => {
      if (node.type === 'tabStack' && node.id === targetSplitId) {
        const newTabStack: TabStackType = {
          type: 'tabStack',
          id: `stack-${ uuidv4() }`,
          tabs: [tabToMove],
          activeTabIndex: 0,
        };

        const newSplit: SplittedTabsType = {
          type: 'splittedTabs',
          id: `split-${ uuidv4() }`,
          direction:
            position === 'top' || position === 'bottom' ? 'vertical' : 'horizontal',
          nodeTreeTabs: [],
          splitPercentages: [],
        };

        if (position === 'top' || position === 'left') {
          newSplit.nodeTreeTabs = [newTabStack, { ...node }];
          newSplit.splitPercentages = [50, 50]; // Inizializza splitPercentages
        } else {
          newSplit.nodeTreeTabs = [{ ...node }, newTabStack];
          newSplit.splitPercentages = [50, 50]; // Inizializza splitPercentages
        }

        Object.assign(node, newSplit);

        return true;
      } else if (node.type === 'splittedTabs' && node.id === targetSplitId) {
        const newTabStack: TabStackType = {
          type: 'tabStack',
          id: `stack-${ uuidv4() }`,
          tabs: [tabToMove],
          activeTabIndex: 0,
        };

        if (position === 'top' || position === 'left') {
          node.nodeTreeTabs.unshift(newTabStack);
          node.splitPercentages = Array(node.nodeTreeTabs.length).fill(100 / node.nodeTreeTabs.length);
        } else {
          node.nodeTreeTabs.push(newTabStack);
          node.splitPercentages = Array(node.nodeTreeTabs.length).fill(100 / node.nodeTreeTabs.length);
        }

        return true;

      } else if (node.type === 'splittedTabs') {
        return node.nodeTreeTabs.some(addTabToSplit);
      }
      return false;
    };

    console.log(addTabToSplit(root));
  }

}

export const customMoveTabToNewStackNew = (
  root: NodeTreeTabsType,
  tabId: string,
  targetStackId: string,
  position: number
): void => {
  const tabToMove = findRemoveAndSemplify(root, tabId);

  if (tabToMove) {
    const addTabToStack = (node: NodeTreeTabsType): boolean => {
      if (node.type === 'tabStack' && node.id === targetStackId) {
        node.tabs.splice(position, 0, tabToMove);
        node.activeTabIndex = position;
        return true;
      } else if (node.type === 'splittedTabs') {
        return node.nodeTreeTabs.some(addTabToStack);
      }
      return false;
    };

    addTabToStack(root);
  }
};


const simplifySplittedTabs = (node: NodeTreeTabsType): void => { // TODO: valutare questo
  if (node.type === 'splittedTabs' && node.nodeTreeTabs.length === 1) {
    const onlyChild = node.nodeTreeTabs[0];

    // Rimuovi tutte le proprietà esistenti dal nodo
    Object.keys(node).forEach((key) => {
      delete (node as any)[key];
    });

    // Assegna tutte le proprietà dal figlio unico al nodo
    Object.assign(node, onlyChild);
  }
};
