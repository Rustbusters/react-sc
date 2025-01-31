import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NetworkStats } from "@/components/Stats.tsx";


interface StatsTableProps {
  stats: NetworkStats | null;
}

export const StatsTable = ({ stats }: StatsTableProps) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Statistiche della Rete</h2>
      <Table>
        <TableCaption>Statistiche aggiornate dei nodi della rete.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Node ID</TableHead>
            <TableHead>Pacchetti Inviati</TableHead>
            <TableHead>Pacchetti Persi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          { stats ? (
            Object.entries(stats).map(([nodeId, data]) => (
                <TableRow key={ nodeId } className="cursor-pointer hover:bg-gray-200">
                  <TableCell className="font-medium">{ nodeId }</TableCell>
                  <TableCell>{ data.total_packets_sent }</TableCell>
                  <TableCell>{ data.total_packets_dropped }</TableCell>
                </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={ 3 } className="text-center">
                Caricamento statistiche...
              </TableCell>
            </TableRow>
          ) }
        </TableBody>
      </Table>
    </div>
  );
};
