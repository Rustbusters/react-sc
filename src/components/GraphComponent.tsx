import { useCallback, useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { invoke } from "@tauri-apps/api/core";
import { MousePointerClick, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GraphComponentProps {
  onNodeSelect: (nodeId: string | null) => void;
}

const GraphComponent = ({ onNodeSelect }: GraphComponentProps) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<cytoscape.Core | null>(null);

  const loadGraphData = useCallback(async () => {
    try {
      const response = await invoke<{
        drones: { id: string; connected_node_ids: string[] }[];
        clients: { id: string; connected_drone_ids: string[] }[];
        servers: { id: string; connected_drone_ids: string[] }[];
      }>("get_config");

      if (!cy) return;

      cy.elements().remove();

      const elements: (
        | cytoscape.ElementDefinition
        | cytoscape.EdgeDefinition
        )[] = [];

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

      cy.add(elements);
      cy.layout({ name: "cose" }).run();
    } catch (error) {
      console.error("Failed to load graph data:", error);

      if (error === "No configuration loaded") {
        alert(
          "Configurazione non caricata. Carica una configurazione prima di visualizzare il grafo."
        );
      }
    }
  }, [cy]);

  // Inizializzazione del grafo
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
              const colors: Record<"server" | "drone" | "client", string> = {
                server: "#FEFAF4",
                drone: "#F5FAFA",
                client: "#F9FBF6",
              };

              const type = ele.data("type") as "server" | "drone" | "client";
              return colors[type] || "#000";
            },
            "border-width": 2,
            "border-color": (ele) => {
              const borderColors: Record<
                "server" | "drone" | "client",
                string
              > = {
                server: "#EDCB95",
                drone: "#9ACDC8",
                client: "#C3D59D",
              };

              const type = ele.data("type") as "server" | "drone" | "client";
              return borderColors[type] || "#333";
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
              const borderColors: Record<
                "server" | "drone" | "client",
                string
              > = {
                server: "#E4B567",
                drone: "#74BBB2",
                client: "#A8C373",
              };

              const type = ele.data("type") as "server" | "drone" | "client";
              return borderColors[type] || "#333";
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

    return () => {
      cyInstance.destroy();
    };
  }, []);

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

  return (
    <div className="relative flex flex-col h-full w-full">
      {/* Bottone posizionato in alto a destra */ }
      <Button
        onClick={ loadGraphData }
        className="absolute top-4 right-4 z-10 p-2 aspect-square bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none"
      >
        <RefreshCcw className="w-5 h-5"/>
      </Button>

      <div
        ref={ cyRef }
        className="flex-grow w-full h-full rounded-lg"
      />
      <div className="w-full flex flex-row items-center justify-center gap-2 pb-2">
        <MousePointerClick className="w-5 h-5"/>
        <p className="text-center text-gray-700 font-semibold">Click on nodes</p>
      </div>
    </div>
  );
};

GraphComponent.displayName = "GraphComponent";

export default GraphComponent;
