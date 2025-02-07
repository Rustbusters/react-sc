import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

const NetworkTab = () => {
  return (
    <div className="py-6 space-y-6">
      {/* Statistiche principali */ }
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Pacchetti Inviati" value="12,340"/>
        <StatCard title="NACKs" value="1,290"/>
        <StatCard title="Messaggi" value="3,492"/>
        <StatCard title="B nella Rete" value="13 Mb - 20 ms"/>
      </div>

      {/* Heatmap e Suddivisione per Tipo */ }
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Heatmap (3/5 della larghezza) */ }
        <Card className="md:col-span-3 p-2">
          <CardHeader>
            <CardTitle className="font-semibold">Radar Chart</CardTitle>
          </CardHeader>
          <CardContent>
            {/*<Heatmap width={600} height={300} />*/ }
          </CardContent>
        </Card>

        {/* Suddivisione per tipo (2/5 della larghezza) */ }
        <Card className="md:col-span-2 p-2">
          <CardHeader>
            <CardTitle className="font-semibold">Suddivisione per Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {/*<BarChart width={400} height={300} />*/ }
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


const StatCard = ({ title, value }: { title: string, value: string }) => (
  <Card className="">
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium">{ title }</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-xl font-semibold">{ value }</p>
    </CardContent>
  </Card>
);

export default NetworkTab;
