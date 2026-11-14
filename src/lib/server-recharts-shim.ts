/**
 * server-recharts-shim.ts
 *
 * Shim SSR minimalista para Recharts no Cloudflare Worker.
 * Gráficos Recharts renderizam SVG exclusivamente no cliente após hidratação;
 * evita embutir ~400 KB+ de D3/lodash/recharts no worker SSR sem alterar o cliente.
 */

const NoopChart = () => null;

export default {};
export const ResponsiveContainer = NoopChart;
export const BarChart = NoopChart;
export const LineChart = NoopChart;
export const AreaChart = NoopChart;
export const PieChart = NoopChart;
export const RadarChart = NoopChart;
export const RadialBarChart = NoopChart;
export const ComposedChart = NoopChart;
export const ScatterChart = NoopChart;
export const FunnelChart = NoopChart;
export const Treemap = NoopChart;
export const Sankey = NoopChart;
export const Bar = NoopChart;
export const Line = NoopChart;
export const Area = NoopChart;
export const Pie = NoopChart;
export const Radar = NoopChart;
export const RadialBar = NoopChart;
export const Scatter = NoopChart;
export const Cell = NoopChart;
export const XAxis = NoopChart;
export const YAxis = NoopChart;
export const ZAxis = NoopChart;
export const CartesianGrid = NoopChart;
export const PolarGrid = NoopChart;
export const PolarAngleAxis = NoopChart;
export const PolarRadiusAxis = NoopChart;
export const Tooltip = NoopChart;
export const Legend = NoopChart;
export const ReferenceLine = NoopChart;
export const ReferenceArea = NoopChart;
export const ReferenceDot = NoopChart;
export const Brush = NoopChart;
export const Label = NoopChart;
export const LabelList = NoopChart;
export const ErrorBar = NoopChart;
