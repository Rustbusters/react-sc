import { Bar } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { BarElement, CategoryScale, Chart, Legend, LinearScale, Title, Tooltip, } from "chart.js";

// Registriamo i componenti di Chart.js
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DroneBarChartProps {
  selectedNode: string | null;
}

type DroneHistory = { timestamp: number; event_type: "packets_sent" | "packets_dropped" }[];

export const DroneBarChart = ({ selectedNode }: DroneBarChartProps) => {
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
    const interval = setInterval(fetchHistory, 5000);

    return () => clearInterval(interval);
  }, [selectedNode]);

  if (!selectedNode) return null;
  if (!history) return <p>Caricamento dati...</p>;

  const timestamps = history.map((event) =>
    new Date(event.timestamp * 1000).toLocaleTimeString()
  );

  const sentData = history.map((event) => (event.event_type === "packets_sent" ? 1 : 0));
  const droppedData = history.map((event) => (event.event_type === "packets_dropped" ? 1 : 0));

  const chartData = {
    labels: timestamps,
    datasets: [
      {
        label: "Pacchetti Inviati",
        data: sentData,
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
      {
        label: "Pacchetti Persi",
        data: droppedData,
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

  const options = {
    scales: {
      x: { stacked: true },
      y: { stacked: true },
    },
  };

  return (
    <div className="mt-6 p-4 border rounded bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Pacchetti per Intervallo - { selectedNode }</h3>
      <Bar data={ chartData } options={ options }/>
    </div>
  );
};
