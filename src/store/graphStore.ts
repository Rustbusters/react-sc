import { create } from 'zustand';

interface GraphState {
  elements: cytoscape.ElementDefinition[]; // Gli elementi del grafo (nodi e archi)
  layout: cytoscape.LayoutOptions; // Layout attuale del grafo
  setElements: (elements: cytoscape.ElementDefinition[]) => void;
  setLayout: (layout: cytoscape.LayoutOptions) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  elements: [],
  layout: { name: 'cose', animate: true, fit: true, padding: 80 },
  setElements: (elements) => set({ elements }),
  setLayout: (layout) => set({ layout }),
}));