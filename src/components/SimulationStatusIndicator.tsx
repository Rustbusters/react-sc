import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const statusStyles = {
  Init: { color: "bg-gray-600", text: "Init" },
  Running: { color: "bg-green-600", text: "Running" },
  Stopped: { color: "bg-red-600", text: "Stopped" },
};

export const SimulationStatusIndicator = () => {
  const [status, setStatus] = useState<keyof typeof statusStyles>("Init");

  const handleAction = async (action: "start" | "stop" | "restart") => {
    try {
      if (action === "start") {
        await invoke("start_network");
        setStatus("Running");
      } else if (action === "stop") {
        await invoke("stop_network");
        setStatus("Stopped");
      } else if (action === "restart") {
        // Per il restart, fermiamo la rete e poi la riavviamo
        await invoke("stop_network");
        await invoke("start_network");
        setStatus("Running");
      }
    } catch (error) {
      console.error("Errore nell'aggiornamento dello stato:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="mx-2">
          <span
            className={`${statusStyles[status].color} rounded-full w-2 h-2 inline-block mr-2`}
          />
          {statusStyles[status].text}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => handleAction("start")}>
          Start
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleAction("stop")}>
          Stop
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleAction("restart")}>
          Restart
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
