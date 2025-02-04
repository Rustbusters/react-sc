import GraphComponent from "@/components/GraphComponent.tsx";
import { useState } from "react";
import NetworkInfos from "@/components/NetworkInfos.tsx";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet.tsx";
import NodeDetails from "@/components/NodeDetails.tsx";
import { useSimulation } from "@/components/SimulationContext.tsx";

const Simulation = () => {
  const { status } = useSimulation();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [refreshGraph, setRefreshGraph] = useState<() => void>(() => () => {
  });

  const isSheetOpen = !!selectedNode && status === "Running";

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-1">
        <div className="flex-1 w-full h-full">
          <GraphComponent onNodeSelect={ setSelectedNode } setRefreshGraph={ setRefreshGraph }/>
        </div>
        <div className="w-1/2 ">
          <NetworkInfos/>
        </div>
      </div>

      {/* Sheet di ShadCN */ }
      <Sheet open={ isSheetOpen } onOpenChange={ (open) => !open && setSelectedNode(null) }>
        <SheetContent>
          <SheetHeader>
            {/*<SheetTitle> Dettagli del Nodo </SheetTitle>*/ }
          </SheetHeader>
          { selectedNode && <NodeDetails nodeId={ selectedNode } onClose={ () => setSelectedNode(null) }
                                         refreshGraph={ refreshGraph }/> }
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Simulation;
