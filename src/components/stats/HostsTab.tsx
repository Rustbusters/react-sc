import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";

const HostsTab = () => {
  return (
    <div className="py-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-3 gap-6">
        <Card className="md:col-span-2 md:row-span-3 p-6 shadow-lg border rounded-lg bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Drop / MsgFragment</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder per il grafico */ }
          </CardContent>
        </Card>

        <Card className="p-6 shadow-lg border rounded-lg bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Numero Messaggi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">450</p>
          </CardContent>
        </Card>

        <Card className="p-6 shadow-lg border rounded-lg bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Numero Frammenti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">3,214</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 md:row-span-2 p-6 shadow-lg border rounded-lg bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Latenza nel Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder per il grafico */ }
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HostsTab;
