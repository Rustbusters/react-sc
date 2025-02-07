import React, { createContext, useContext, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner"

// Possible network states
type NetworkStatus = "Init" | "Running" | "Stopped";

const SimulationContext = createContext<{
  status: NetworkStatus;
  isLoading: boolean;
  startNetwork: () => Promise<void>;
  stopNetwork: () => Promise<void>;
  restartNetwork: () => Promise<void>;
  clientUrl: string;
  setClientUrl: (url: string) => void;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  pollingInterval: number;
  setPollingInterval: (interval: number) => void;
}>({
  status: "Init",
  isLoading: true,
  startNetwork: async () => {
  },
  stopNetwork: async () => {
  },
  restartNetwork: async () => {
  },
  clientUrl: "",
  setClientUrl: () => {
  },
  serverUrl: "http://127.0.0.1:8080",
  setServerUrl: () => {
  },
  pollingInterval: 5000,
  setPollingInterval: () => {
  },
});

// Custom hook to access the simulation context
export const useSimulation = () => useContext(SimulationContext);

export const SimulationProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<NetworkStatus>("Init");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [clientUrl, setClientUrl] = useState<string>(localStorage.getItem("clientUrl") || "http://localhost:7373");
  const [serverUrl, setServerUrl] = useState<string>(localStorage.getItem("serverUrl") || "http://127.0.0.1:8080");
  const [pollingInterval, setPollingInterval] = useState<number>(Number(localStorage.getItem("pollingInterval")) || 5000);

  useEffect(() => {
    localStorage.setItem("clientUrl", clientUrl);
  }, [clientUrl]);

  useEffect(() => {
    localStorage.setItem("serverUrl", serverUrl);
  }, [serverUrl]);

  useEffect(() => {
    localStorage.setItem("pollingInterval", pollingInterval.toString());
  }, [pollingInterval]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const response = await invoke<NetworkStatus>("get_network_status");
        setStatus(response);
      } catch (error) {
        console.error("Error retrieving network status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<string>("network_status_changed", (event) => {
      console.log(`Network status updated: ${ event.payload }`);
      setStatus(event.payload as NetworkStatus);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const startNetwork = async () => {
    try {
      await invoke("start_network");
      toast.success("Simulation started! Configuration saved to history.");
    } catch (error) {
      console.error("Error starting the network:", error);
      toast.error("Failed to start simulation.");
    }
  };

  const stopNetwork = async () => {
    try {
      await invoke("stop_network");
    } catch (error) {
      console.error("Error stopping the network:", error);
    }
  };

  const restartNetwork = async () => {
    try {
      await invoke("stop_network");
      await invoke("start_network");
    } catch (error) {
      console.error("Error restarting the network:", error);
    }
  };

  return (
    <SimulationContext.Provider
      value={ {
        status,
        isLoading,
        startNetwork,
        stopNetwork,
        restartNetwork,
        clientUrl,
        setClientUrl,
        serverUrl,
        setServerUrl,
        pollingInterval,
        setPollingInterval,
      } }
    >
      { children }
    </SimulationContext.Provider>
  );
};
