import { NodeTreeTabsType } from "@/types";
import { useCallback, useState } from "react";

export const useDynamicLayout = (initialLayout: NodeTreeTabsType) => {
  const [layout, setLayout] = useState<NodeTreeTabsType>(initialLayout);

  const updateLayout = useCallback((updateFn: (draft: NodeTreeTabsType) => void) => {
    setLayout(prevLayout => {
      const newLayout = structuredClone(prevLayout);
      updateFn(newLayout);
      return newLayout;
    });
  }, []);

  return { layout, updateLayout };
};