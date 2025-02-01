import { Bar } from '@visx/shape';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Group } from '@visx/group';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { defaultStyles, Tooltip } from '@visx/tooltip';
import { useState } from "react";

const data = [
  { name: 'Gen', value: 400 },
  { name: 'Feb', value: 300 },
  { name: 'Mar', value: 500 },
  { name: 'Apr', value: 700 },
];

// Dimensioni del grafico
const width = 400;
const height = 300;
const margin = { top: 20, right: 20, bottom: 40, left: 50 };

// Creiamo le scale
const xScale = scaleBand({
  domain: data.map(d => d.name),
  padding: 0.4,
  range: [margin.left, width - margin.right],
});

const yScale = scaleLinear({
  domain: [0, Math.max(...data.map(d => d.value))],
  range: [height - margin.bottom, margin.top],
});

// Stile del tooltip
const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  padding: '5px',
  borderRadius: '4px',
};

const BarChart = () => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number } | null>(null);

  return (
    <div style={ { position: 'relative' } }>
      <svg width={ width } height={ height }>
        <Group>
          {/* Asse Y */ }
          <AxisLeft scale={ yScale } left={ margin.left }/>
          {/* Asse X */ }
          <AxisBottom scale={ xScale } top={ height - margin.bottom }/>
          {/* Disegniamo le barre */ }
          { data.map(d => (
            <Bar
              key={ d.name }
              x={ xScale(d.name) }
              y={ yScale(d.value) }
              width={ xScale.bandwidth() }
              height={ height - margin.bottom - yScale(d.value) }
              fill="#4f46e5"
              onMouseEnter={ (event) => {
                const { pageX, pageY } = event;
                setTooltip({ x: pageX, y: pageY, value: d.value });
              } }
              onMouseLeave={ () => setTooltip(null) }
              style={ { cursor: 'pointer', transition: 'fill 0.2s' } }
            />
          )) }
        </Group>
      </svg>

      {/* Tooltip */ }
      { tooltip && (
        <Tooltip top={ tooltip.y - 150 } left={ tooltip.x - 300 } style={ tooltipStyles }>
          Valore: { tooltip.value }
        </Tooltip>
      ) }
    </div>
  );
};

export default BarChart;
