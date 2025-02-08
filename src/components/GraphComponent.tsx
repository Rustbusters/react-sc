import { useCallback, useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { invoke } from "@tauri-apps/api/core";
import { PlusCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/components/SimulationContext.tsx";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { getCssVariableAsRGB } from "@/lib/utils.ts";

interface GraphComponentProps {
  onNodeSelect: (nodeId: string | null) => void;
  setRefreshGraph: (refreshFunction: () => void) => void;
}

const GraphComponent = ({ onNodeSelect, setRefreshGraph }: GraphComponentProps) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<cytoscape.Core | null>(null);
  const { status } = useSimulation();
  const [_zoomLevel, setZoomLevel] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectedNodes, setConnectedNodes] = useState<Record<string, boolean>>({});
  const [pdr, setPdr] = useState<number>(0.10);


  const saveGraphLayout = () => {
    if (!cy) return;
    const positions = cy.nodes().map((node) => ({
      id: node.id(),
      position: node.position(),
    }));
    sessionStorage.setItem("graph_layout", JSON.stringify(positions));
  };

  const isGraphDifferent = (newElements: any[]) => {
    if (!cy) return true;
    const currentElements = cy.elements().jsons();
    return JSON.stringify(currentElements) !== JSON.stringify(newElements);
  };

  const removeGraphElement = (id: string, type: "node" | "edge") => {
    if (!cy) return;
    const element = type === "node" ? cy.$(`#${ id }`) : cy.$(`edge[source="${ id }"], edge[target="${ id }"]`);
    element.remove();
  };

  const loadGraphData = useCallback(async () => {
    try {
      const response = await invoke<{
        drones: { id: string; connected_node_ids: string[] }[];
        clients: { id: string; connected_drone_ids: string[] }[];
        servers: { id: string; connected_drone_ids: string[] }[];
      }>("get_graph");

      if (!cy) return;

      const elements: (cytoscape.ElementDefinition | cytoscape.EdgeDefinition)[] = [];

      // Aggiunta dei nodi
      response.drones.forEach((drone) => {
        elements.push({
          data: { id: drone.id, label: `${ drone.id }`, type: "drone" },
        });
      });

      response.clients.forEach((client) => {
        elements.push({
          data: { id: client.id, label: `${ client.id }`, type: "client" },
        });
      });

      response.servers.forEach((server) => {
        elements.push({
          data: { id: server.id, label: `${ server.id }`, type: "server" },
        });
      });

      // Aggiunta degli archi
      response.drones.forEach((drone) => {
        drone.connected_node_ids.forEach((nodeId) => {
          if (drone.id < nodeId) return; // Evita di aggiungere archi duplicati

          elements.push({
            data: { source: drone.id, target: nodeId },
          });
        });
      });

      response.servers.forEach((server) => {
        server.connected_drone_ids.forEach((droneId) => {
          if (server.id < droneId) return; // Evita di aggiungere archi duplicati

          elements.push({
            data: { source: server.id, target: droneId },
          });
        });
      });

      response.clients.forEach((client) => {
        client.connected_drone_ids.forEach((droneId) => {
          if (client.id < droneId) return; // Evita di aggiungere archi duplicati

          elements.push({
            data: { source: client.id, target: droneId },
          });
        });
      });

      // Check if the graph is different from the current one
      if (isGraphDifferent(elements)) {
        cy.elements().remove();
        cy.add(elements);

        // Restore the saved layout
        const savedLayout = sessionStorage.getItem("graph_layout");
        if (savedLayout) {
          const positions = JSON.parse(savedLayout);
          positions.forEach((node: any) => {
            cy.$(`#${ node.id }`).position(node.position);
          });
        }

        cy.layout({ name: "cose" }).run();
      }
    } catch (error) {
      console.error("Failed to load graph data:", error);
      toast.error("Failed to load graph data");
    }
  }, [cy]);

  // Initialization of the graph
  useEffect(() => {
    if (!cyRef.current) return;

    const cyInstance = cytoscape({
      container: cyRef.current,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-halign": "center",
            "text-valign": "center",
            "background-color": (ele) => {
              const type = ele.data("type") as "server" | "drone" | "client";
              return getCssVariableAsRGB(`--${ type }-background`);
            },
            "border-width": 2,
            "border-color": (ele) => {
              const type = ele.data("type") as "server" | "drone" | "client";
              return getCssVariableAsRGB(`--${ type }-border`);
            },
            width: 20,
            height: 20,
            "font-size": "12px",
            color: "#000",
            "text-outline-color": "#000",
            // 'text-outline-width': '1px'
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#C2C2C2",
            "curve-style": "bezier",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 2.5,
            "border-color": (ele) => {
              const type = ele.data("type") as "server" | "drone" | "client";
              return getCssVariableAsRGB(`--${ type }-border-selected`);
            },
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "#0284c7",
            width: 3,
          },
        },
      ],
      layout: {
        name: "cose",
        animate: true,
        fit: true,
        padding: 80,
      },
    });

    setCy(cyInstance);

    const savedLayout = sessionStorage.getItem("graph_layout");
    if (savedLayout) {
      const positions = JSON.parse(savedLayout);
      positions.forEach((node: any) => {
        cyInstance.$(`#${ node.id }`).position(node.position);
      });
    }

    return () => {
      saveGraphLayout();
      cyInstance.destroy();
    };
  }, []);

  // Update of the graph layout when the window is resized
  useEffect(() => {
    if (!cy) return;
    const resizeObserver = new ResizeObserver(() => {
      cy.resize();
      cy.fit();
    });

    if (cyRef.current) {
      resizeObserver.observe(cyRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [cy]);

  // Remove selected nodes and edges when the backspace key is pressed
  useEffect(() => {
    if (!cy || status === "Running") return;

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key !== "Backspace") return;
      event.preventDefault();

      const selectedNodes = cy.nodes(":selected");
      const selectedEdges = cy.edges(":selected");

      if (selectedNodes.length > 0) {
        for (const node of selectedNodes) {
          const nodeId = node.id();
          console.log(`Removing node: ${ nodeId }`);
          await invoke("config_remove_node", { nodeId: Number(nodeId) });
          removeGraphElement(nodeId, "node");
        }
        selectedNodes.unselect();
      }

      if (selectedEdges.length > 0) {
        for (const edge of selectedEdges) {
          const source = edge.source().id();
          const target = edge.target().id();
          console.log(`Removing edge: ${ source } - ${ target }`);
          await invoke("config_remove_edge", { node1Id: Number(source), node2Id: Number(target) });
          removeGraphElement(edge.id(), "edge");
        }
        selectedEdges.unselect();
      }

      loadGraphData();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cy, loadGraphData, status]);


  useEffect(() => {
    if (!cy) return;

    const handleSelect = (event: cytoscape.EventObject) => {
      const nodeId = event.target.id();
      console.log("Nodo selezionato:", nodeId);
      onNodeSelect(nodeId); // Passa l'ID selezionato a `App.tsx`
    };

    const handleUnselect = () => {
      console.log("Nessun nodo selezionato");
      onNodeSelect(null); // Quando nessun nodo è selezionato, invia `null`
    };

    cy.on("select", "node", handleSelect);
    cy.on("unselect", "node", handleUnselect);

    return () => {
      cy.off("select", "node", handleSelect);
      cy.off("unselect", "node", handleUnselect);
    };
  }, [cy, onNodeSelect]);

  useEffect(() => {
    if (!cy) return;

    const updateZoom = () => {
      setZoomLevel(cy.zoom());
    };

    cy.on("zoom", updateZoom);

    return () => {
      cy.off("zoom", updateZoom);
    };
  }, [cy]);


  useEffect(() => {
    if (!cy) return;

    const handleSelect = (event: cytoscape.EventObject) => {
      const nodeId = event.target.id();
      console.log("Nodo selezionato:", nodeId);
      onNodeSelect(nodeId);
    };

    cy.on("tap", "node", handleSelect);

    return () => {
      cy.off("tap", "node", handleSelect);
    };
  }, [cy, onNodeSelect]);

  // Carica i dati del grafo quando `cy` è pronto
  useEffect(() => {
    if (cy) {
      loadGraphData().then(() => {
      });
    }
  }, [cy, loadGraphData]);

  useEffect(() => {
    setRefreshGraph(() => loadGraphData);
  }, [loadGraphData, setRefreshGraph]);

  /*const getCyclicGridSize = (zoom: number) => {
    const baseSize = 20;
    const maxScale = 35;

    return baseSize * Math.pow(2, (Math.log2(zoom) % Math.log2(maxScale / baseSize)));
  };*/

  const handleAddDrone = async () => {
    try {
      const selectedNodes = Object.keys(connectedNodes).filter((id) => connectedNodes[id]);
      const newDroneId = await invoke<number>("add_drone", {
        connectedNodeIds: selectedNodes.map(Number),
        pdr: Number(pdr),
      });

      toast.success(`Drone ${ newDroneId } added successfully!`);
      setIsDialogOpen(false);
      loadGraphData();
    } catch (error) {
      console.error("Error while adding the drone:", error);
      toast.error("Error while adding the drone.");
    }
  };


  return (
    <div className="relative flex flex-col h-full w-full min-w-0 overflow-hidden rounded-lg">
      <div
        ref={ cyRef }
        className="flex-grow w-full h-full rounded-lg"
        /*style={ {
          backgroundColor: "white",
          backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.3) 1px, transparent 1px)",
          backgroundSize: `${ getCyclicGridSize(zoomLevel) }px ${ getCyclicGridSize(zoomLevel) }px`,
          backgroundPosition: "center",
        } }*/
      />

      <div className="flex items-center gap-4 absolute bottom-4 right-4 z-10">
        <Button
          onClick={ () => setIsDialogOpen(true) }
          className="p-2 aspect-square"
        >
          <PlusCircle className="w-5 h-5"/>
        </Button>

        <Button
          onClick={ () => {
            saveGraphLayout();
            loadGraphData();
          } }
          className="p-2 aspect-square"
        >
          <RefreshCcw className="w-5 h-5"/>
        </Button>
      </div>

      {/* Dialog to Add a Node */ }
      <Dialog open={ isDialogOpen } onOpenChange={ setIsDialogOpen }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a New Drone</DialogTitle>
            <DialogDescription>Configure the new drone before adding it to the network.</DialogDescription>
          </DialogHeader>

          {/* Input for PDR */ }
          <div>
            <label className="text-sm font-semibold">Packet Drop Rate (PDR)</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={ pdr }
              onChange={ (e) => setPdr(parseFloat(e.target.value)) }
            />
          </div>

          {/* Selection of Connected Nodes */ }
          <div>
            <label className="text-sm font-semibold">Connected Nodes</label>
            <div className="flex flex-wrap gap-2">
              { cy &&
                cy.nodes().map((node) => (
                  <label key={ node.id() } className="flex items-center gap-2">
                    <Checkbox
                      checked={ connectedNodes[node.id()] || false }
                      onCheckedChange={ (checked) =>
                        setConnectedNodes((prev) => ({
                          ...prev,
                          [node.id()]: checked === true,
                        }))
                      }
                    />
                    { node.id() }
                  </label>
                )) }
            </div>
          </div>

          <DialogFooter>
            <Button onClick={ handleAddDrone }>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

GraphComponent.displayName = "GraphComponent";

export default GraphComponent;
