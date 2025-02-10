import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { toast } from "sonner";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.tsx";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { NetworkNode } from "@/pages/NetworkStats.tsx";
import { useSimulation } from "@/components/SimulationContext.tsx";
import { TrendingUp } from "lucide-react";

interface LatencyData {
  secs: number;
  nanos: number;
}

interface HostMetrics {
  latencies: LatencyData[];
  number_of_fragment_sent: number;
  time_series: Array<{ timestamp: number; sent: number; acked: number }>;
}

const chartLatencyConfig = {
  latency: {
    label: "Latency (ms)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const chartSentAckConfig = {
  sent: {
    label: "Sent Packets",
    color: "hsl(var(--chart-1))",
  },
  acked: {
    label: "Acknowledged Packets",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const HostsTab = ({ selectedHostId }: { selectedHostId: NetworkNode | null }) => {
  const [metrics, setMetrics] = useState<HostMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { pollingInterval } = useSimulation();

  useEffect(() => {
    if (!selectedHostId) return;

    if (selectedHostId.type !== "Client" && selectedHostId.type !== "Server") {
      setMetrics(null);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const response: HostMetrics = await invoke("get_host_metrics", { nodeId: selectedHostId.id });
        setMetrics(response);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching host metrics:", error);
        toast.error("Error fetching host metrics.");
        setLoading(false);
      }
    };

    fetchMetrics().then(r => r);
    const interval = setInterval(fetchMetrics, pollingInterval);
    return () => clearInterval(interval);
  }, [selectedHostId]);

  if (!selectedHostId) {
    return <p className="text-center">Select a host to view statistics</p>;
  }

  if (loading) {
    return <p className="text-center">Loading...</p>;
  }

  if (!metrics) {
    return <p className="text-center">Data not available</p>;
  }

  // Convert latency values to milliseconds
  const latencyValues = metrics.latencies.map(latency => (latency.secs * 1e3) + (latency.nanos / 1e6));

  // Calculate mean (average) latency in ms
  const meanLatency = latencyValues.length > 0
    ? latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length
    : 0;

  // Calculate variance in ms²
  const varianceLatency = latencyValues.length > 1
    ? latencyValues.reduce((sum, value) => sum + Math.pow(value - meanLatency, 2), 0) / latencyValues.length
    : 0;

  // Format the values to be displayed
  const formatLatency = (latency: number): string => `${ latency.toFixed(3) } ms`;
  const formatVariance = (variance: number): string => `${ variance.toFixed(3) } ms²`;

  // Data for the chart
  const latencyChartData = latencyValues.map((latency, index) => ({
    time: index + 1, // Relative time index
    latency,
  }));

  const lineChartData = metrics.time_series.map((point) => ({
    time: new Date(point.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sent: point.sent,
    acked: point.acked,
  }));

  return (
    <div className="flex gap-4 py-6 select-none">
      {/* Drop / MsgFragment Chart */ }
      <Card className="w-1/2 p-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">MsgFragment Sent vs Acknowledged</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={ chartSentAckConfig }>
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
                stroke="hsl(var(--chart-3))"
                strokeWidth={ 2 }
                dot={ false }
              />
              <Line
                dataKey="acked"
                type="monotone"
                stroke="hsl(var(--chart-5))"
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
                Sent: { metrics.time_series.length > 0 ? metrics.time_series[metrics.time_series.length - 1].sent.toString() : "0" }
                |
                Acknowledged: { metrics.time_series.length > 0 ? metrics.time_series[metrics.time_series.length - 1].acked.toString() : "0" }
                <TrendingUp className="h-4 w-4"/>
              </div>
              <div className="text-muted-foreground">
                Showing message trend over time
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>

      <div className="w-1/2 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Messages Sent" value={ metrics.latencies.length.toString() }/>
          <StatCard title="Fragments Sent" value={ metrics.number_of_fragment_sent.toString() }/>
        </div>

        {/* Latency Over Time Chart */ }
        <Card className="w-full p-3">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Latency Over Time (ms)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ chartLatencyConfig }>
              <LineChart
                accessibilityLayer
                data={ latencyChartData }
                margin={ { left: 12, right: 12 } }
              >
                <CartesianGrid vertical={ false }/>
                <XAxis dataKey="time" tick={ false } axisLine={ false }/>
                <ChartTooltip cursor={ false } content={ <ChartTooltipContent/> }/>
                <Line
                  dataKey="latency"
                  type="monotone"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={ 2 }
                  dot={ false } // Removes dots from the line
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-start gap-2 text-sm">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 font-medium leading-none">
                  <span>Mean: { formatLatency(meanLatency) }</span> | Variance: { formatVariance(varianceLatency) }
                </div>
                <div className="text-muted-foreground">
                  Showing latency trend over time
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <Card className="">
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium">{ title }</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-xl font-semibold">{ value }</p>
    </CardContent>
  </Card>
);

export default HostsTab;
