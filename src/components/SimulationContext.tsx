import { createContext, useContext, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Definiamo i possibili stati della rete
type NetworkStatus = "Init" | "Running" | "Stopped";

// Creiamo il contesto con un valore di default
const SimulationContext = createContext<{
  status: NetworkStatus;
  isLoading: boolean;
  startNetwork: () => Promise<void>;
  stopNetwork: () => Promise<void>;
  restartNetwork: () => Promise<void>;
}>({
  status: "Init",
  isLoading: true,
  startNetwork: async () => {
  },
  stopNetwork: async () => {
  },
  restartNetwork: async () => {
  },
});

// Hook per accedere facilmente al contesto
export const useSimulation = () => useContext(SimulationContext);

// Provider che gestisce lo stato centralizzato
export const SimulationProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<NetworkStatus>("Init");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Recuperiamo lo stato della rete dal backend all'avvio
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await invoke<NetworkStatus>("get_network_status");
        console.log(`Stato iniziale della rete: ${ response }`);
        setStatus(response);
      } catch (error) {
        console.error("Errore nel recupero dello stato della rete:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<string>("network_status_changed", (event) => {
      console.log(`Stato della rete aggiornato: ${ event.payload }`);
      setStatus(event.payload as NetworkStatus);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Funzioni per avviare/fermare la rete
  const startNetwork = async () => {
    try {
      await invoke("start_network");
      setStatus("Running");
    } catch (error) {
      console.error("Errore nell'avvio della rete:", error);
    }
  };

  const stopNetwork = async () => {
    try {
      await invoke("stop_network");
      setStatus("Stopped");
    } catch (error) {
      console.error("Errore nell'arresto della rete:", error);
    }
  };

  const restartNetwork = async () => {
    try {
      await invoke("stop_network");
      await invoke("start_network");
      setStatus("Running");
    } catch (error) {
      console.error("Errore nel riavvio della rete:", error);
    }
  };

  return (
    <SimulationContext.Provider value={ { status, isLoading, startNetwork, stopNetwork, restartNetwork } }>
      { children }
    </SimulationContext.Provider>
  );
};
