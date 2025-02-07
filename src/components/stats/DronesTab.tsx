import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";


const DronesTab = () => {

  return (
    <div className="py-6 space-y-6">

      {/* Layout griglia */ }
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Grafico Pacchetti Inviati vs Droppati (occupazione 3/5 della larghezza) */ }
        <Card className="md:col-span-3 p-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Pacchetti Inviati vs Droppati</CardTitle>
          </CardHeader>
          <CardContent>
            ¯\_(ツ)_/¯
          </CardContent>
        </Card>

        {/* Card Percentuale Pacchetti (in alto a destra) */ }
        <div className="md:col-span-2 space-y-4">
          <Card className="p-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Percentuale Pacchetti Ricevuti vs Inviati</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">92%</p>
            </CardContent>
          </Card>

          {/* Due Card affiancate: Centralità e Shortcuts */ }
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Centralità</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">0.78</p>
              </CardContent>
            </Card>
            <Card className="p-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Shortcuts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">14</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Grafico Suddivisione per Tipo (in basso a destra) */ }
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3"></div>
        {/* Placeholder per mantenere layout */ }
        <Card className="md:col-span-2 p-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Suddivisione per Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            ¯\_(ツ)_/¯
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DronesTab;
