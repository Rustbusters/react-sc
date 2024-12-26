// types/index.ts
export type TabType = {
  id: string;
  label: string;
  componentId: string;
  closeable: boolean;
};

export type TabStackType = {
  type: 'tabStack';
  id: string;
  tabs: TabType[];
  activeTabIndex: number;
};

export type SplittedTabsType = {
  type: 'splittedTabs';
  id: string;
  direction: 'horizontal' | 'vertical';
  nodeTreeTabs: NodeTreeTabsType[];
  splitPercentages: number[];
};

export type NodeTreeTabsType = TabStackType | SplittedTabsType;