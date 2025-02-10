import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertOctagon, Link, PlusCircle, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useSimulation } from "@/components/SimulationContext";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Badge } from "@/components/ui/badge";

type NodeInfo = {
  node_id: number;
  node_type: "Drone" | "Client" | "Server";
  node_group: string;
  connections: number[];
  metrics: DroneMetrics | HostMetrics | EmptyMetrics;
};

type DroneMetrics = {
  category: "Drone";
  pdr: number;
  current_pdr: number;
  packets_sent: number;
  packets_dropped: number;
  shortcuts_used: number;
  packet_type_counts: Record<string, number>;
};

type HostMetrics = {
  category: "Host";
  packets_sent: number;
  packets_acked: number;
  shortcuts_used: number;
  packet_type_counts: Record<string, number>;
  latencies: number[];
};

type EmptyMetrics = {
  category: "None";
};

interface NodeDetailsProps {
  nodeId: string;
  onClose: () => void;
  refreshGraph: () => void;
}

const NodeDetails = ({ nodeId, onClose, refreshGraph }: NodeDetailsProps) => {
  const [nodeData, setNodeData] = useState<NodeInfo | null>(null);
  const [newNeighbor, setNewNeighbor] = useState<string>("");
  // pdrInput holds the locally edited PDR value as a string.
  const [pdrInput, setPdrInput] = useState<string>("");
  // isEditing tracks if the user is currently editing the PDR input.
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { clientUrl, serverUrl, pollingInterval } = useSimulation();

  // Fetch node details from the backend.
  const fetchNodeDetails = useCallback(async () => {
    try {
      const response = await invoke<NodeInfo>("get_node_info", { nodeId: Number(nodeId) });
      setNodeData(response);
    } catch (error) {
      console.error("Error fetching node details:", error);
      toast.error("Error fetching node details");
    }
  }, [nodeId]);

  useEffect(() => {
    fetchNodeDetails();
    const interval = setInterval(fetchNodeDetails, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchNodeDetails, pollingInterval]);

  // When not editing, update the local input from the backend value.
  useEffect(() => {
    if (nodeData && nodeData.metrics.category === "Drone" && !isEditing) {
      setPdrInput(nodeData.metrics.pdr.toFixed(2));
    }
  }, [nodeData, isEditing]);

  // Update the PDR for drones (value sent as an integer percentage).
  const updatePdr = async (newPdr: number) => {
    try {
      console.log("Updating PDR:", newPdr);
      await invoke("set_pdr", { droneId: Number(nodeId), pdr: Math.round(newPdr * 100) });
      setNodeData((prev) =>
        prev && prev.metrics.category === "Drone"
          ? { ...prev, metrics: { ...prev.metrics, pdr: newPdr } }
          : prev
      );
      toast.success("PDR updated successfully");
    } catch (error) {
      console.error("Error updating PDR:", error);
      toast.error("Error updating PDR");
    }
  };

  // Handle onBlur: validate the input and update the PDR if needed.
  const handlePdrBlur = () => {
    setIsEditing(false);
    const newValue = parseFloat(pdrInput);
    if (nodeData && nodeData.metrics.category === "Drone") {
      if (!isNaN(newValue) && newValue !== nodeData.metrics.pdr) {
        updatePdr(newValue);
      } else {
        // Revert to the backend value if input is invalid or unchanged.
        setPdrInput(nodeData.metrics.pdr.toFixed(2));
      }
    }
  };

  // Neighbors and other actions remain unchanged.
  const addNeighbor = async () => {
    if (!newNeighbor.trim()) return;
    try {
      await invoke("add_edge", { node1Id: Number(nodeId), node2Id: Number(newNeighbor) });
      setNodeData((prev) =>
        prev
          ? { ...prev, connections: [...prev.connections, Number(newNeighbor)].sort((a, b) => a - b) }
          : prev
      );
      setNewNeighbor("");
      refreshGraph();
    } catch (error: any) {
      console.error("Error adding neighbor:", error);
      if (error && error.message) {
        toast.error(`Graph validation failed: ${ error.message }`);
      } else {
        toast.error("Error adding neighbor.");
      }
    }
  };

  const removeNeighbor = async (neighborId: number) => {
    try {
      await invoke("remove_edge", { node1Id: Number(nodeId), node2Id: neighborId });
      setNodeData((prev) =>
        prev ? { ...prev, connections: prev.connections.filter((n) => n !== neighborId) } : prev
      );
      refreshGraph();
    } catch (error: any) {
      console.error("Error removing neighbor:", error);
      if (error && error.message) {
        toast.error(`Graph validation failed: ${ error.message }`);
      } else {
        toast.error("Error removing neighbor.");
      }
    }
  };

  const crashNode = async () => {
    try {
      await invoke("remove_node", { nodeId: Number(nodeId) });
      toast.success(`Drone ${ nodeId } crashed`);
      refreshGraph();
      onClose();
    } catch (error: any) {
      console.error("Error crashing drone:", error);
      if (error && error.message) {
        toast.error(`Crash failed: ${ error.message }`);
      } else {
        toast.error("Error crashing drone.");
      }
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Drone":
        return "bg-[#F5FAFA] text-[#9ACDC8]";
      case "Client":
        return "bg-[#F9FBF6] text-[#C3D59D]";
      case "Server":
        return "bg-[#FEFAF4] text-[#EDCB95]";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const openExternalLink = async (url: string) => {
    try {
      console.log("Opening URL:", url);
      await openUrl(url);
    } catch (error) {
      console.error("Error opening URL:", error);
      toast.error("Unable to open the link.");
    }
  };

  if (!nodeData) return <p className="text-center">Loading...</p>;

  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-background shadow-xl flex flex-col border-l">
      {/* Header */ }
      <div className="p-4 flex justify-between items-center border-b sticky top-0">
        <h2 className="text-xl font-semibold flex items-center">
          Node Details #{ nodeId }
          <span className={ `ml-3 px-2 py-1 text-sm rounded-md ${ getTypeColor(nodeData.node_type) }` }>
            { nodeData.node_type }
          </span>
        </h2>
        <div className="flex items-center">
          { nodeData && (nodeData.node_type === "Client" || nodeData.node_type === "Server") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={ () =>
                openExternalLink(nodeData.node_type === "Client" ? clientUrl : serverUrl)
              }
            >
              <Link/>
            </Button>
          ) }
          <Button variant="ghost" size="icon" onClick={ onClose }>
            <X size={ 20 }/>
          </Button>
        </div>
      </div>

      {/* Main Content */ }
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Neighbors Section */ }
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Neighbors</Label>
            { nodeData.node_group && <Badge variant="default">{ nodeData.node_group }</Badge> }
          </div>
          <div className="mt-2 space-y-2">
            { nodeData.connections.length > 0 ? (
              nodeData.connections.map((neighbor) => (
                <div key={ neighbor } className="flex items-center justify-between bg-muted px-3 py-2 rounded-md">
                  <span className="font-medium">{ neighbor }</span>
                  <Button variant="destructive" size="icon" onClick={ () => removeNeighbor(neighbor) }>
                    <Trash2 size={ 16 }/>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No neighbors</p>
            ) }
          </div>
          <div className="flex items-center mt-3 space-x-2">
            <Input
              type="text"
              placeholder="New neighbor ID"
              value={ newNeighbor }
              onChange={ (e) => setNewNeighbor(e.target.value) }
            />
            <Button onClick={ addNeighbor } className="flex items-center">
              <PlusCircle size={ 16 } className="mr-1"/> Add
            </Button>
          </div>
        </div>

        {/* Drone Controls */ }
        { nodeData.metrics.category === "Drone" && (
          <>
            <div>
              <Label className="text-muted-foreground">PDR (Packet Drop Rate)</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={ pdrInput }
                  onChange={ (e) => setPdrInput(e.target.value) }
                  onFocus={ () => setIsEditing(true) }
                  onBlur={ handlePdrBlur }
                />
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={ crashNode }
              className="w-full flex items-center justify-center mt-4"
            >
              <AlertOctagon size={ 16 } className="mr-1"/> Crash Drone
            </Button>
          </>
        ) }

        {/* Compact Statistics */ }
        <div>
          <Label className="text-muted-foreground">Statistics</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Packets Sent:</span>
              <span className="font-medium">
                { (nodeData.metrics.category === "Drone" || nodeData.metrics.category === "Host")
                  ? (nodeData.metrics as DroneMetrics | HostMetrics).packets_sent
                  : "-" }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>
                { nodeData.metrics.category === "Drone" ? "Packets Dropped:" : "Packets Acked:" }
              </span>
              <span className="font-medium">
                { nodeData.metrics.category === "Drone"
                  ? (nodeData.metrics as DroneMetrics).packets_dropped
                  : nodeData.metrics.category === "Host"
                    ? (nodeData.metrics as HostMetrics).packets_acked
                    : "-" }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shortcuts Used:</span>
              <span className="font-medium">
                { (nodeData.metrics.category === "Drone" || nodeData.metrics.category === "Host")
                  ? (nodeData.metrics as DroneMetrics | HostMetrics).shortcuts_used
                  : "-" }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetails;
