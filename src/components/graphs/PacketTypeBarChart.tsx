import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.tsx";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";

const chartConfig = {
  MsgFragment: {
    label: "MsgFragment",
    color: "hsl(var(--chart-1))",
  },
  Ack: {
    label: "Ack",
    color: "hsl(var(--chart-2))",
  },
  Nack: {
    label: "Nack",
    color: "hsl(var(--chart-3))",
  },
  FloodRequest: {
    label: "FReq",
    color: "hsl(var(--chart-4))",
  },
  FloodResponse: {
    label: "FRes",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

interface PacketTypeBarChartProps {
  packetData: Record<string, number>;
}

const PacketTypeBarChart: React.FC<PacketTypeBarChartProps> = ({ packetData }) => {
  if (!packetData || Object.keys(packetData).length === 0) {
    return <p className="text-center">No packet data available</p>;
  }

  const barChartData = Object.entries(packetData)
    .map(([packetType, count]) => ({
      type: packetType === "FloodRequest" ? "FReq" :
        packetType === "FloodResponse" ? "FRes" :
          packetType === "MsgFragment" ? "MsgFrag" :
            packetType,
      count,
    }))
    .sort((a, b) => a.type.localeCompare(b.type));

  return (
    <Card className="md:col-span-2 p-2">
      <CardHeader>
        <CardTitle className="font-semibold">Breakdown by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ chartConfig }>
          <BarChart accessibilityLayer data={ barChartData } margin={ { top: 20 } }>
            <CartesianGrid vertical={ false }/>
            <XAxis
              dataKey="type"
              tickLine={ false }
              tickMargin={ 10 }
              axisLine={ false }
            />
            <ChartTooltip cursor={ false } content={ <ChartTooltipContent hideLabel/> }/>
            <Bar dataKey="count" fill="var(--color-desktop)" radius={ 8 }>
              <LabelList position="top" offset={ 12 } className="fill-foreground" fontSize={ 12 }/>
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default PacketTypeBarChart;
