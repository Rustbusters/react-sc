// helpers.ts
import { NodeTreeTabsType, SplittedTabsType, TabStackType, TabType } from '@/types';

// TODO: controllare se la tab che voglio spostare è già all'interno della tabStack di destinazione

// ========================================================
// updateActiveTab
// ========================================================
/**
 * Aggiorna l’activeTabIndex in un determinato stack (stackId) in base al tabId da attivare.
 */
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

// ========================================================
// closeTab
// ========================================================
/**
 * Chiude una tab specifica in uno stack. Se lo stack diventa vuoto, viene rimosso dal suo genitore.
 * Ricalcola poi gli splitPercentages se necessario.
 */
export const closeTab = (
  node: NodeTreeTabsType,
  stackId: string,
  tabId: string
): boolean => {
  if (node.type === 'tabStack' && node.id === stackId) {
    const tabIndex = node.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex !== -1) {
      node.tabs.splice(tabIndex, 1);

      // Se è vuoto, restituiamo "true" => segnala al padre di rimuoverlo.
      if (node.tabs.length === 0) {
        return true;
      }

      // Se l'activeTabIndex va oltre la lunghezza attuale, lo riduciamo
      if (node.activeTabIndex != null && node.activeTabIndex >= node.tabs.length) {
        node.activeTabIndex = node.tabs.length - 1;
      }
    }
  } else if (node.type === 'splittedTabs') {
    for (let i = 0; i < node.nodeTreeTabs.length; i++) {
      const child = node.nodeTreeTabs[i];
      const isEmpty = closeTab(child, stackId, tabId);

      if (isEmpty) {
        // Rimuove il figlio vuoto
        node.nodeTreeTabs.splice(i, 1);
        node.splitPercentages.splice(i, 1);

        recalcSplitPercentages(node);
        i--;
      }
    }
  }
  return false;
};

/**
 * Ricalcola in modo uniforme le splitPercentages per un splittedTabs,
 * in modo che ogni child abbia la stessa fetta di spazio.
 */
function recalcSplitPercentages(node: SplittedTabsType) {
  if (node.nodeTreeTabs.length === 0) {
    node.splitPercentages = [];
    return;
  }
  const equalShare = 100 / node.nodeTreeTabs.length;
  node.splitPercentages = Array(node.nodeTreeTabs.length).fill(equalShare);
}

// ========================================================
// moveTabToStack (ex customMoveTabToNewStack)
// ========================================================
/**
 * Sposta la tab (tabId) in un altro stack (targetStackId), aggiungendola in coda.
 * Se il vecchio stack diventa vuoto, viene rimosso.
 */
export const moveTabToStack = (
  root: NodeTreeTabsType,
  tabId: string,
  targetStackId: string
): void => {
  const tabToMove = removeTabAndReturnIt(root, tabId, targetStackId);
  if (!tabToMove) return;

  // Aggiungiamo la tab in coda allo stack target
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
};

// ========================================================
// moveTabToStackAtIndex (ex customMoveTabToNewStackNew)
// ========================================================
/**
 * Sposta la tab (tabId) nello stack (targetStackId), inserendola in una posizione specifica "position".
 * Se il vecchio stack diventa vuoto, viene rimosso.
 */
export const moveTabToStackAtIndex = (
  root: NodeTreeTabsType,
  tabId: string,
  targetStackId: string,
  position: number
): void => {
  const tabToMove = removeTabAndReturnIt(root, tabId, targetStackId);
  if (!tabToMove) return;

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
};

// ========================================================
// moveTabIntoNewSplitted (ex customMoveTabInNewSplittedTabs)
// ========================================================
/**
 * Sposta la tab (tabId) e crea un nuovo splitted attorno a "targetSplitId",
 * posizionando la tab spostata in un nuovo stack "top/bottom/left/right".
 * Se il vecchio stack diventa vuoto, viene rimosso.
 */
export const moveTabIntoNewSplitted = (
  root: NodeTreeTabsType,
  tabId: string,
  targetSplitId: string,
  position: 'top' | 'bottom' | 'left' | 'right'
): void => {
  const tabToMove = removeTabAndReturnIt(root, tabId, targetSplitId);
  if (!tabToMove) return;

  const addTabToSplit = (node: NodeTreeTabsType): boolean => {
    // Se targetSplitId è un tabStack => trasformalo in splitted
    if (node.type === 'tabStack' && node.id === targetSplitId) {
      // Creiamo un nuovo stack con la tab
      const newTabStack: TabStackType = {
        type: 'tabStack',
        id: 'stack-new', // se vuoi un ID univoco, generane uno, ma non random ogni volta
        tabs: [tabToMove],
        activeTabIndex: 0,
      };

      // Costruiamo lo splitted "in-place", riusando lo stesso "node.id"
      const newSplitted: SplittedTabsType = {
        type: 'splittedTabs',
        id: node.id,  // Riusiamo l’ID del vecchio stack
        direction: (position === 'top' || position === 'bottom') ? 'vertical' : 'horizontal',
        nodeTreeTabs: [],
        splitPercentages: [50, 50],
      };

      // Ordine
      if (position === 'top' || position === 'left') {
        newSplitted.nodeTreeTabs = [newTabStack, { ...node }];
      } else {
        newSplitted.nodeTreeTabs = [{ ...node }, newTabStack];
      }

      // "Sostituiamo" in-place
      const splittedNode = node as unknown as SplittedTabsType;
      splittedNode.type = newSplitted.type;
      splittedNode.id = newSplitted.id;
      splittedNode.direction = newSplitted.direction;
      splittedNode.nodeTreeTabs = newSplitted.nodeTreeTabs;
      splittedNode.splitPercentages = newSplitted.splitPercentages;

      return true;
    }
    // Se targetSplitId è splitted => aggiungi un nuovo stack
    else if (node.type === 'splittedTabs' && node.id === targetSplitId) {
      const newTabStack: TabStackType = {
        type: 'tabStack',
        id: 'stack-new',
        tabs: [tabToMove],
        activeTabIndex: 0,
      };

      if (position === 'top' || position === 'left') {
        node.nodeTreeTabs.unshift(newTabStack);
      } else {
        node.nodeTreeTabs.push(newTabStack);
      }
      recalcSplitPercentages(node);
      return true;
    } else if (node.type === 'splittedTabs') {
      return node.nodeTreeTabs.some(addTabToSplit);
    }
    return false;
  };

  addTabToSplit(root);
};

// ========================================================
// removeTabAndReturnIt (ex findRemoveAndSemplify)
// ========================================================
/**
 * Rimuove la tab "tabId" dall’albero e la restituisce.
 * Se un tabStack diventa vuoto, lo rimuove dal padre.
 * Non fa "semplificazioni" ulteriori.
 */
function removeTabAndReturnIt(node: NodeTreeTabsType, tabId: string, skipRemoveId?: string): TabType | null {
  if (node.type === 'tabStack') {
    const tabIndex = node.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex !== -1) {
      const removedTab = node.tabs.splice(tabIndex, 1)[0];
      // Aggiorniamo activeTabIndex
      if (node.activeTabIndex != null && node.activeTabIndex >= node.tabs.length) {
        node.activeTabIndex = Math.max(0, node.tabs.length - 1);
      }
      return removedTab;
    }
  } else if (node.type === 'splittedTabs') {
    for (let i = 0; i < node.nodeTreeTabs.length; i++) {
      const child = node.nodeTreeTabs[i];
      const removedTab = removeTabAndReturnIt(child, tabId, skipRemoveId);
      if (removedTab) {
        // Se "child" è rimasto vuoto, rimuoviamo il child
        if (isNodeEmpty(child)) { // && child.id !== skipRemoveId // TODO: fix this
          node.nodeTreeTabs.splice(i, 1);
          node.splitPercentages.splice(i, 1);
          recalcSplitPercentages(node);
          i--;
        }
        return removedTab;
      }
    }
  }
  return null;
}

/**
 * Determina se un nodo (stack o splitted) è vuoto:
 * - stack -> no tabs
 * - splitted -> no children
 */
function isNodeEmpty(node: NodeTreeTabsType): boolean {
  if (node.type === 'tabStack') {
    return node.tabs.length === 0;
  } else {
    return node.nodeTreeTabs.length === 0;
  }
}

