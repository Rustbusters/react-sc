import { Pie } from "react-chartjs-2";

export const DronePieChart = ({ totalSent, totalDropped }: { totalSent: number; totalDropped: number }) => {
  const chartData = {
    labels: ["Pacchetti Inviati", "Pacchetti Persi"],
    datasets: [
      {
        data: [totalSent, totalDropped],
        backgroundColor: ["rgb(75, 192, 192)", "rgb(255, 99, 132)"],
      },
    ],
  };

  return (
    <div className="mt-6 p-4 border rounded bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Distribuzione Totale</h3>
      <Pie data={ chartData }/>
    </div>
  );
};
