import GraphComponent from "@/components/GraphComponent.tsx";
import { Stats } from "@/components/Stats.tsx";
import { useState } from "react";

const Simulation = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-1">
        <div className="flex-1 w-full h-full">
          <GraphComponent onNodeSelect={ setSelectedNode }/>
        </div>
        <div className="w-3/5 ">
          <Stats selectedNode={ selectedNode }/>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
