import { Button } from "@/components/ui/button.tsx";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const statusStyles = {
  Init: { color: "bg-gray-600", text: "Init" },
  Running: { color: "bg-green-600", text: "Running" },
  Stopped: { color: "bg-red-600", text: "Stopped" },
};

export const SimulationStatusIndicator = () => {
  const [status, setStatus] = useState<keyof typeof statusStyles>("Init");

  const handleClick = async () => {
    let newStatus: keyof typeof statusStyles;

    try {
      if (status === "Init") {
        await invoke("start_network");
        newStatus = "Running";
      } else if (status === "Running") {
        await invoke("stop_network");
        newStatus = "Stopped";
      } else {
        await invoke("start_network");
        newStatus = "Running";
      }
      setStatus(newStatus);
    } catch (error) {
      console.error("Errore nell'aggiornamento dello stato:", error);
    }
  };

  return (
    <Button variant="ghost" className="mx-2" onClick={ handleClick }>
      <span className={ `${ statusStyles[status].color } rounded-full w-2 h-2 inline-block` }/>
      { statusStyles[status].text }
    </Button>
  );
};
