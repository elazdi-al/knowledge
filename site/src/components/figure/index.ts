import { Diagram } from "./Diagram";
import { Cells, Table } from "./marks/data";
import { Edge } from "./marks/edge";
import { Canvas, Col, Graph, Grid, Group, Row } from "./marks/layout";
import { Node } from "./marks/node";
import { Brace } from "./marks/brace";
import { Fit } from "./marks/fit";
import { Legend } from "./marks/legend";
import { Circle, Dot, Ellipse, Line, Path, Poly, Space, Svg } from "./marks/shapes";
import { Dots, Tag, Text } from "./marks/text";

export { Diagram, type DiagramProps, type FigureProps } from "./Diagram";
export { toScene } from "./compile";
export { formatDiagnostic, type Diagnostic, type DiagnosticCode } from "./diagnostics";
export { layoutScene } from "./layout";
export { mark, type Common, type Marker } from "./mark";
export { Cells, Table, tableColumnWidths, type CellInput, type CellItem, type CellsProps, type RowInput, type TableCell, type TableProps, type TableRow } from "./marks/data";
export { Edge, type EdgeProps } from "./marks/edge";
export { Canvas, Col, Graph, Grid, Group, Row, type CanvasProps, type ColProps, type GraphProps, type GridProps, type GroupProps, type RowProps } from "./marks/layout";
export { Node, nodeTitleW, type NodeProps } from "./marks/node";
export { Brace, type BraceProps } from "./marks/brace";
export { Fit, type FitProps } from "./marks/fit";
export { Legend, type LegendItem, type LegendProps } from "./marks/legend";
export { arc, Circle, Dot, Ellipse, Line, Path, Poly, Space, Svg, type CircleProps, type DotProps, type EllipseProps, type LineProps, type PathProps, type PolyProps, type SpaceProps, type SvgProps } from "./marks/shapes";
export { Dots, Tag, Text, type DotsProps, type TagProps, type TextProps } from "./marks/text";
export { measure } from "./measure";
export * from "./model";
export { labelPillW } from "./route";
export { CELL, FONT, GROUP, LABEL_CLEAR, LINE_H, MAX_CONTENT_W, NODE, STROKE, TABLE, TAG } from "./theme";

/** Everything an MDX author needs, keyed by tag name. */
export const figureComponents = { Diagram, Row, Col, Grid, Group, Graph, Canvas, Fit, Space, Node, Cells, Table, Text, Tag, Dots, Legend, Poly, Path, Line, Circle, Ellipse, Dot, Svg, Edge, Brace };
