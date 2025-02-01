import { LinePath } from '@visx/shape';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { Group } from '@visx/group';

const data = [
  { date: new Date(2024, 0, 1), value: 100 },
  { date: new Date(2024, 1, 1), value: 200 },
  { date: new Date(2024, 2, 1), value: 300 },
  { date: new Date(2024, 3, 1), value: 250 },
];

// Dimensioni del grafico
const width = 400;
const height = 300;
const margin = { top: 20, right: 20, bottom: 40, left: 50 };

// Creiamo le scale
const xScale = scaleTime({
  domain: [Math.min(...data.map(d => d.date.getTime())), Math.max(...data.map(d => d.date.getTime()))],
  range: [margin.left, width - margin.right],
});

const yScale = scaleLinear({
  domain: [0, Math.max(...data.map(d => d.value))],
  range: [height - margin.bottom, margin.top],
});

const LineChart = () => (
  <svg width={ width } height={ height }>
    <Group>
      {/* Asse Y */ }
      <AxisLeft scale={ yScale } left={ margin.left }/>
      {/* Asse X */ }
      <AxisBottom scale={ xScale } top={ height - margin.bottom }/>
      {/* Disegniamo la linea */ }
      <LinePath
        data={ data }
        x={ d => xScale(d.date) }
        y={ d => yScale(d.value) }
        stroke="#4f46e5"
        strokeWidth={ 2 }
      />
    </Group>
  </svg>
);

export default LineChart;
