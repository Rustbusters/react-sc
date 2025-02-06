import { useEffect, useState } from "react";
import { NetworkRadarStats } from "@/components/graphs/NetworkRadarChart.tsx";
import { invoke } from "@tauri-apps/api/core";
import { PieChart, PieData } from "@/components/graphs/PieChart.tsx";

export type DroneStats = {
  drone: string;
  sent: number;
  dropped: number;
  pdr: number;
  shortcuts: number;
  packetTypeCounts: Record<string, number>;
};

export type DroneStatsMap = {
  stats: {
    [drone: string]: {
      total_packets_sent: number;
      total_packets_dropped: number;
      pdr: number;
      shortcuts_used: number;
      packet_type_counts: Record<string, number>;
    };
  };
};

const NetworkStatsPage = () => {
  const [droneData, setDroneData] = useState<DroneStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDroneStats() {
      try {
        const result = await invoke<DroneStatsMap>("get_all_drones_statistics");
        if (result && result.stats) {
          const data: DroneStats[] = Object.entries(result.stats).map(
            ([drone, values]) => ({
              drone,
              sent: values.total_packets_sent,
              dropped: values.total_packets_dropped,
              pdr: values.pdr,
              shortcuts: values.shortcuts_used,
              packetTypeCounts: values.packet_type_counts,
            })
          );
          setDroneData(data);
        }
      } catch (error) {
        console.error("Errore nel recupero delle statistiche:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDroneStats();
    const interval = setInterval(fetchDroneStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalSent = droneData.reduce((acc, curr) => acc + curr.sent, 0);
  const totalDropped = droneData.reduce((acc, curr) => acc + curr.dropped, 0);
  const totalShortcuts = droneData.reduce((acc, curr) => acc + curr.shortcuts, 0);

  const pieData: PieData[] = [
    { label: "Sent", value: totalSent },
    { label: "Dropped", value: totalDropped },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Statistiche della Rete</h1>

      {/* Card Totali */ }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Pacchetti Inviati</h2>
          <p className="text-3xl font-bold">{ totalSent }</p>
        </div>
        <div className="border p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Pacchetti Droppati</h2>
          <p className="text-3xl font-bold">{ totalDropped }</p>
        </div>
        <div className="border p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Shortcuts Utilizzati</h2>
          <p className="text-3xl font-bold">{ totalShortcuts }</p>
        </div>
      </div>

      {/* Radar Chart */ }
      <section>
        <h2 className="text-xl font-semibold mb-2">Radar Statistiche per Drone</h2>
        { loading ? (
          <p>Caricamento...</p>
        ) : (
          <div className="flex justify-center">
            <NetworkRadarStats width={ 500 } height={ 500 } data={ droneData } levels={ 5 }/>
          </div>
        ) }
      </section>

      {/* Pie Chart */ }
      <section>
        <h2 className="text-xl font-semibold mb-2">Proporzione Inviati vs Droppati</h2>
        { loading ? (
          <p>Caricamento...</p>
        ) : (
          <div className="flex justify-center">
            <PieChart width={ 400 } height={ 400 } data={ pieData }/>
          </div>
        ) }
      </section>
    </div>
  );
};

export default NetworkStatsPage;
