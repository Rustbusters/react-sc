import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { toast } from "sonner";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.tsx";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import PacketTypeBarChart from "@/components/graphs/PacketTypeBarChart.tsx";

interface DroneMetrics {
  drops: number;
  current_pdr: number;
  shortcuts: number;
  packet_type_counts: Record<string, number>;
  time_series: Array<{ timestamp: number; sent: number; dropped: number }>;
}

const chartConfig = {
  sent: {
    label: "Sent Packets",
    color: "hsl(var(--chart-1))",
  },
  dropped: {
    label: "Dropped Packets",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const DronesTab = ({ selectedDroneId }: { selectedDroneId: number | null }) => {
  const [metrics, setMetrics] = useState<DroneMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedDroneId) return;

    const fetchMetrics = async () => {
      try {
        const response: DroneMetrics = await invoke("get_drone_metrics", { nodeId: selectedDroneId });
        setMetrics(response);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching drone metrics:", error);
        toast.error("Error fetching drone metrics.");
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [selectedDroneId]);

  if (!selectedDroneId) {
    return <p className="text-center">Select a drone to view statistics</p>;
  }

  if (loading) {
    return <p className="text-center">Loading...</p>;
  }

  if (!metrics) {
    return <p className="text-center">Data not available</p>;
  }

  const totalPacketsSent = Object.values(metrics.packet_type_counts).reduce((sum, count) => sum + count, 0);
  const receivedPacketPercentage = totalPacketsSent > 0 ? ((totalPacketsSent - metrics.drops) / totalPacketsSent) * 100 : 0;
  const latestMetrics = metrics.time_series.length > 0 ? metrics.time_series[metrics.time_series.length - 1] : {
    sent: 0,
    dropped: 0
  };


  // Convert timestamps to readable format and prepare chart data
  const lineChartData = metrics.time_series.map((point) => ({
    time: new Date(point.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sent: point.sent,
    dropped: point.dropped,
  }));

  return (
    <div className="py-6 space-y-6">
      {/* Grid Layout */ }
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sent vs Dropped Packets Line Chart */ }
        <Card className="md:col-span-2 md:row-span-3 p-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">MsgFragment sent vs dropped</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ chartConfig }>
              <LineChart
                accessibilityLayer
                data={ lineChartData }
                margin={ { left: 12, right: 12 } }
              >
                <CartesianGrid vertical={ false }/>
                <XAxis
                  dataKey="time"
                  tickLine={ false }
                  axisLine={ false }
                  tickMargin={ 8 }
                />
                <ChartTooltip cursor={ false } content={ <ChartTooltipContent/> }/>
                <Line
                  dataKey="sent"
                  type="monotone"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={ 2 }
                  dot={ false }
                />
                <Line
                  dataKey="dropped"
                  type="monotone"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={ 2 }
                  dot={ false }
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-start gap-2 text-sm">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 font-medium leading-none">
                  Sent: { latestMetrics.sent.toLocaleString() } |
                  Dropped: { latestMetrics.dropped.toLocaleString() } <TrendingUp className="h-4 w-4"/>
                </div>
                <div className="text-muted-foreground">
                  Showing packet trend over time
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Packet Reception Rate */ }
        <div className="md:col-span-2 space-y-4">
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Packet Reception Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{ receivedPacketPercentage.toFixed(2) }%</p>
            </CardContent>
          </Card>

          {/* Two Side-by-Side Cards: PDR & Shortcuts */ }
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Packet Delivery Ratio (PDR)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{ metrics.current_pdr.toFixed(2) }</p>
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Shortcuts Used</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{ metrics.shortcuts }</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Packet Type Breakdown Chart */ }
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <PacketTypeBarChart packetData={ metrics.packet_type_counts }/>
      </div>
    </div>
  );
};

export default DronesTab;
