import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { Line } from "@visx/shape";
import { Point } from "@visx/point";

// Colori per ogni metrica
export const sentColor = "#4f46e5";
export const droppedColor = "#ef4444";
export const shortcutColor = "#f59e0b";  // Nuovo colore per shortcuts
const gridColor = "#d9d9d9";
const background = "#FAF7E9";

// Tipi di dati aggiornati
export type DroneStats = {
  drone: string;
  sent: number;
  dropped: number;
  shortcuts: number;
};

// Funzione per generare i punti di un poligono radar
export function genPolygonPoints<Datum>(
  dataArray: Datum[],
  scaleFn: (n: number) => number,
  getValue: (d: Datum) => number
): { points: { x: number; y: number }[]; pointString: string } {
  const step = (Math.PI * 2) / dataArray.length;
  let pointString = "";
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i < dataArray.length; i++) {
    const value = getValue(dataArray[i]);
    const r = scaleFn(value);
    const x = r * Math.sin(i * step);
    const y = -r * Math.cos(i * step);
    points.push({ x, y });
    pointString += `${ x },${ y } `;
  }

  if (points.length > 0) {
    pointString += `${ points[0].x },${ points[0].y }`;
  }

  return { points, pointString };
}

// Proprietà del Radar Chart
export type RadarChartProps = {
  width: number;
  height: number;
  levels?: number;
  data: DroneStats[];
};

export const NetworkRadarStats = ({
                                    width,
                                    height,
                                    levels = 5,
                                    data,
                                  }: RadarChartProps) => {
  const margin = { top: 40, right: 80, bottom: 80, left: 80 };
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;
  const radius = Math.min(xMax, yMax) / 2;

  // Calcola il massimo valore tra tutte le metriche
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.sent, d.dropped, d.shortcuts))
  );

  // Scala per mappare i valori ai raggi del radar
  const yScale = scaleLinear<number>({
    range: [0, radius],
    domain: [0, maxValue || 1], // Evita dominio vuoto
  });

  // Calcola la distanza angolare tra gli assi
  const step = (Math.PI * 2) / data.length;

  // Genera la griglia radar
  const webs = [...new Array(levels)].map((_, level) =>
    genPolygonPoints(data, () => ((level + 1) * radius) / levels, () => 1)
  );

  // Punti degli assi
  const axesPoints = data.map((_, i) => ({
    x: radius * Math.sin(i * step),
    y: -radius * Math.cos(i * step),
  }));

  const origin = new Point({ x: 0, y: 0 });

  // Genera poligoni per ogni metrica
  const polygonSent = genPolygonPoints(data, yScale, (d) => d.sent);
  const polygonDropped = genPolygonPoints(data, yScale, (d) => d.dropped);
  const polygonShortcuts = genPolygonPoints(data, yScale, (d) => d.shortcuts);

  return width < 10 ? null : (
    <svg width={ width } height={ height }>
      <rect fill={ background } width={ width } height={ height } rx={ 14 }/>
      <Group top={ height / 2 } left={ width / 2 }>
        {/* Griglia radar */ }
        { webs.map((web, i) => (
          <polygon
            key={ `web-${ i }` }
            points={ web.pointString }
            fill="none"
            stroke={ gridColor }
            strokeWidth={ 1 }
            strokeOpacity={ 0.7 }
          />
        )) }
        {/* Assi */ }
        { axesPoints.map((p, i) => (
          <Line key={ `axis-${ i }` } from={ origin } to={ p } stroke={ gridColor } strokeWidth={ 1 }/>
        )) }
        {/* Poligono pacchetti inviati */ }
        <polygon
          points={ polygonSent.pointString }
          fill={ sentColor }
          fillOpacity={ 0.3 }
          stroke={ sentColor }
          strokeWidth={ 2 }
        />
        { polygonSent.points.map((point, i) => (
          <circle key={ `sent-point-${ i }` } cx={ point.x } cy={ point.y } r={ 3 } fill={ sentColor }/>
        )) }
        {/* Poligono pacchetti droppati */ }
        <polygon
          points={ polygonDropped.pointString }
          fill={ droppedColor }
          fillOpacity={ 0.3 }
          stroke={ droppedColor }
          strokeWidth={ 2 }
        />
        { polygonDropped.points.map((point, i) => (
          <circle key={ `dropped-point-${ i }` } cx={ point.x } cy={ point.y } r={ 3 } fill={ droppedColor }/>
        )) }
        {/* Poligono shortcuts */ }
        <polygon
          points={ polygonShortcuts.pointString }
          fill={ shortcutColor }
          fillOpacity={ 0.3 }
          stroke={ shortcutColor }
          strokeWidth={ 2 }
        />
        { polygonShortcuts.points.map((point, i) => (
          <circle key={ `shortcut-point-${ i }` } cx={ point.x } cy={ point.y } r={ 3 } fill={ shortcutColor }/>
        )) }
        {/* Etichette per i droni */ }
        { data.map((d, i) => {
          const labelOffset = 20;
          const x = (radius + labelOffset) * Math.sin(i * step);
          const y = -(radius + labelOffset) * Math.cos(i * step);
          return (
            <text
              key={ `label-${ i }` }
              x={ x }
              y={ y }
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={ 12 }
              fill="#333"
            >
              { d.drone }
            </text>
          );
        }) }
      </Group>
    </svg>
  );
};
