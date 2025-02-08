import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import { getCssVariableAsRGB } from "@/lib/utils.ts";

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface HeatmapGraphProps {
  heatmap: Record<string, number>;
  nodeTypes: Record<string, "Drone" | "Client" | "Server">;
}


const HeatmapGraph = ({ heatmap, nodeTypes }: HeatmapGraphProps) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);
  const [prevGraph, setPrevGraph] = useState<{ nodes: Set<string>; edges: string[] } | null>(null);

  const nodes = new Set<string>();
  const edgesMap = new Map<string, GraphEdge>();

  Object.entries(heatmap).forEach(([key, weight]) => {
    let [src, dest] = key.split(",");
    if (!src || !dest) return;

    if (src > dest) [src, dest] = [dest, src];

    nodes.add(src);
    nodes.add(dest);

    const edgeKey = `${ src }-${ dest }`;
    if (edgesMap.has(edgeKey)) {
      edgesMap.get(edgeKey)!.weight += weight;
    } else {
      edgesMap.set(edgeKey, { source: src, target: dest, weight });
    }
  });

  const edges = Array.from(edgesMap.values());

  const maxWeight = Math.max(...edges.map((e) => e.weight), 1);
  const minWeight = Math.min(...edges.map((e) => e.weight), maxWeight);

  useEffect(() => {
    if (!cyRef.current) return;

    const primaryColor = getCssVariableAsRGB("--primary");
    const newGraph = {
      nodes: new Set(nodes),
      edges: edges.map((e) => `${ e.source }-${ e.target }`),
    };

    if (
      prevGraph &&
      newGraph.nodes.size === prevGraph.nodes.size &&
      newGraph.edges.length === prevGraph.edges.length &&
      newGraph.edges.every((edge) => prevGraph.edges.includes(edge))
    ) {
      edges.forEach((edge) => {
        const cyEdge = cyInstance.current?.edges(`[source="${ edge.source }"][target="${ edge.target }"]`);
        if (cyEdge) {
          cyEdge.style({
            width: normalizeEdgeWeight(edge.weight, minWeight, maxWeight),
            "line-color": primaryColor,
          });
        }
      });
      return;
    }

    cyInstance.current?.destroy();

    cyInstance.current = cytoscape({
      container: cyRef.current,
      elements: [
        ...Array.from(nodes).map((id) => ({
          data: { id, label: id, type: nodeTypes[id] || "Client" },
        })),
        ...edges.map((edge) => ({
          data: { source: edge.source, target: edge.target, weight: edge.weight },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            "background-color": (ele) => getNodeColor(ele.data("type")),
            "border-width": 2,
            "border-color": (ele) => getNodeBorderColor(ele.data("type")),
            color: "#000",
            "font-size": "12px",
            "font-weight": "bold",
            width: 24,
            height: 24,
            shape: "ellipse",
            "events": "no"
          },
        },
        {
          selector: "edge",
          style: {
            "line-color": primaryColor,
            width: (ele: cytoscape.NodeSingular) => normalizeEdgeWeight(ele.data("weight"), minWeight, maxWeight),
            "curve-style": "bezier",
            "events": "no"
          },
        },
      ],
      layout: {
        name: "cose",
        fit: true,
        padding: 40,
      },
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
    });

    setPrevGraph(newGraph);
  }, [heatmap, nodeTypes]);

  const normalizeEdgeWeight = (weight: number, minW: number, maxW: number): number => {
    if (maxW === minW) return 3;
    return 1 + ((weight - minW) / (maxW - minW)) * 5; // Normalizza tra 1 e 6
  };

  const getNodeColor = (type: string): string => {
    const colors: Record<"Server" | "Drone" | "Client", string> = {
      Server: "#FEFAF4",
      Drone: "#F5FAFA",
      Client: "#F9FBF6",
    };
    // QUi tutti sono Client
    return colors[type as keyof typeof colors] || "#ddd";
  };

  // 🎨 **Colori dei bordi**
  const getNodeBorderColor = (type: string): string => {
    const borderColors: Record<"Server" | "Drone" | "Client", string> = {
      Server: "#EDCB95",
      Drone: "#9ACDC8",
      Client: "#C3D59D",
    };
    return borderColors[type as keyof typeof borderColors] || "#aaa";
  };

  return <div ref={ cyRef } className="w-full h-[400px]"></div>;
};

export default HeatmapGraph;