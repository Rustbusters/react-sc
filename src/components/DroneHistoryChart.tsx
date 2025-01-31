import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CategoryScale, Chart, Legend, LinearScale, LineElement, PointElement, Title, Tooltip, } from "chart.js";

// Registriamo i componenti di Chart.js
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface DroneHistoryChartProps {
  selectedNode: string | null;
}

type DroneHistory = { timestamp: number; event_type: "packets_sent" | "packets_dropped" }[];

export const DroneHistoryChart = ({ selectedNode }: DroneHistoryChartProps) => {
  const [history, setHistory] = useState<DroneHistory | null>(null);

  useEffect(() => {
    if (!selectedNode) return;

    const fetchHistory = async () => {
      try {
        const response = await invoke<{ history: DroneHistory }>("get_drone_history", {
          nodeId: Number(selectedNode),
        });
        setHistory(response.history);
      } catch (error) {
        console.error("Errore nel recupero della history:", error);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000); // Aggiorna ogni 5 secondi

    return () => clearInterval(interval);
  }, [selectedNode]);

  if (!selectedNode) return null;
  if (!history) return <p>Caricamento dati...</p>;

  let totalSent = 0;
  let totalDropped = 0;

  // Convertiamo i dati in cumulativi
  const timestamps = history.map((event) =>
    new Date(event.timestamp * 1000).toLocaleTimeString()
  );

  const sentData = history.map((event) => {
    if (event.event_type === "packets_sent") totalSent += 1;
    return totalSent;
  });

  const droppedData = history.map((event) => {
    if (event.event_type === "packets_dropped") totalDropped += 1;
    return totalDropped;
  });

  const chartData = {
    labels: timestamps,
    datasets: [
      {
        label: "Pacchetti Inviati (Cumulativo)",
        data: sentData,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.1,
      },
      {
        label: "Pacchetti Persi (Cumulativo)",
        data: droppedData,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="mt-6 p-4 border rounded bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Andamento Cumulativo - { selectedNode }</h3>
      <Line data={ chartData }/>
    </div>
  );
};
