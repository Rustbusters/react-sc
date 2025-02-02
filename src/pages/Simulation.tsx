import GraphComponent from "@/components/GraphComponent.tsx";
import { useState } from "react";
import NetworkInfos from "@/components/NetworkInfos.tsx";

const Simulation = () => {
  const [_selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-1">
        <div className="flex-1 w-full h-full">
          <GraphComponent onNodeSelect={ setSelectedNode }/>
        </div>
        <div className="w-1/2 ">
          <NetworkInfos/>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
