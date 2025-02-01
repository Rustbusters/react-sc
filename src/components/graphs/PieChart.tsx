import { Group } from "@visx/group";
import { Arc } from "@visx/shape";
import { pie } from "d3-shape";

export type PieData = {
  label: string;
  value: number;
};

export type PieChartProps = {
  width: number;
  height: number;
  data: PieData[];
  // Array di colori: per esempio, [colore per "sent", colore per "dropped"]
  colors?: string[];
};

export const PieChart = ({
                           width,
                           height,
                           data,
                           colors = ["#4f46e5", "#ef4444"],
                         }: PieChartProps) => {
  if (width < 10 || height < 10) return null;

  // Calcola il raggio: metà della dimensione minore
  const radius = Math.min(width, height) / 2;

  // Crea un generatore di "pie" (da d3-shape)
  const pieGenerator = pie<PieData>().value((d) => d.value);

  // Genera gli archi a partire dai dati
  const arcs = pieGenerator(data);

  return (
    <svg width={ width } height={ height }>
      {/* Posiziona il gruppo al centro dello SVG */ }
      <Group top={ height / 2 } left={ width / 2 }>
        { arcs.map((arc, index) => {
          // Usa il colore corrispondente dalla lista (se ne hai più di 2, cicla i colori)
          const fill = colors[index % colors.length];
          return (
            <Arc
              key={ `arc-${ index }` }
              data={ arc }
              innerRadius={ 0 }
              outerRadius={ radius }
              cornerRadius={ 3 }
              fill={ fill }
              stroke="#fff"
              strokeWidth={ 1 }
            />
          );
        }) }
      </Group>
    </svg>
  );
};
