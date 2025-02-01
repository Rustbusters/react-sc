import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { Line } from "@visx/shape";
import { Point } from "@visx/point";

export const sentColor = "#4f46e5";      // colore per pacchetti inviati
export const droppedColor = "#ef4444";    // colore per pacchetti droppati
const gridColor = "#d9d9d9";
const background = "#FAF7E9";

// Tipi di dati
export type DroneStats = {
  drone: string;
  sent: number;
  dropped: number;
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
    // Partendo dall'alto: x = r * sin(θ), y = -r * cos(θ)
    const x = r * Math.sin(i * step);
    const y = -r * Math.cos(i * step);
    points.push({ x, y });
    pointString += `${ x },${ y } `;
  }
  // Chiude il poligono ripetendo il primo punto
  if (points.length > 0) {
    pointString += `${ points[0].x },${ points[0].y }`;
  }
  return { points, pointString };
}

// Proprietà del componente RadarChart
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

  // Calcola il massimo valore tra "sent" e "dropped" per definire il dominio
  const maxValue = Math.max(...data.map((d) => Math.max(d.sent, d.dropped)));

  // Scala lineare: mappa [0, maxValue] a [0, radius]
  const yScale = scaleLinear<number>({
    range: [0, radius],
    domain: [0, maxValue],
  });

  // Angle between two consecutive axes (in radians)
  const step = (Math.PI * 2) / data.length;

  // Genera la griglia radar (web): per ogni livello genera un poligono unitario
  const webs = [...new Array(levels)].map((_, level) =>
    genPolygonPoints(data, (_: number) => ((level + 1) * radius) / levels, () => 1)
  );

  // Calcola i punti degli assi: ogni asse termina al raggio massimo
  const axesPoints = data.map((_, i) => ({
    x: radius * Math.sin(i * step),
    y: -radius * Math.cos(i * step),
  }));

  const origin = new Point({ x: 0, y: 0 });

  const polygonSent = genPolygonPoints<DroneStats>(
    data,
    (d: number) => yScale(d), // TODO: check
    (d: DroneStats) => d.sent
  );

  const polygonDropped = genPolygonPoints<DroneStats>(
    data,
    (d: number) => yScale(d), // TODO: check
    (d: DroneStats) => d.dropped
  );

  return width < 10 ? null : (
    <svg width={ width } height={ height }>
      {/* Sfondo */ }
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
        {/* Poligono dei pacchetti inviati */ }
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
        {/* Poligono dei pacchetti droppati */ }
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
        {/* Etichette per ogni drone */ }
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
