import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { StatsTable } from "./StatsTable";
import { DroneHistoryChart } from "./DroneHistoryChart";

export type NetworkStats = {
  [key: string]: {
    total_packets_sent: number;
    total_packets_dropped: number;
  };
};

interface StatsTableProps {
  selectedNode: string | null;
}

export const Stats = ({ selectedNode }: StatsTableProps) => {
  const [stats, setStats] = useState<NetworkStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await invoke<{ stats: NetworkStats }>("get_all_drones_statistics");
        setStats(response.stats);
      } catch (error) {
        console.error("Errore nel recupero delle statistiche:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Aggiorna ogni 5 secondi

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <StatsTable stats={ stats }/>
      <DroneHistoryChart selectedNode={ selectedNode }/>
    </div>
  );
};
