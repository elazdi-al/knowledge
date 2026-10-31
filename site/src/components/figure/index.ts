import { Diagram } from "./Diagram";
import { Cells, Table } from "./marks/data";
import { Edge } from "./marks/edge";
import { Col, Free, Graph, Grid, Group, Row } from "./marks/layout";
import { Node } from "./marks/node";
import { Dot, Path, Poly, Space } from "./marks/shapes";
import { Dots, Tag, Text } from "./marks/text";

export { Diagram, type DiagramProps, type FigureProps } from "./Diagram";
export { toScene } from "./compile";
export { formatDiagnostic, type Diagnostic, type DiagnosticCode } from "./diagnostics";
export { layoutScene } from "./layout";
export { mark, type Common, type Marker } from "./mark";
export { Cells, Table, tableColumnWidths, type CellInput, type CellItem, type CellsProps, type RowInput, type TableCell, type TableProps, type TableRow } from "./marks/data";
export { Edge, type EdgeProps } from "./marks/edge";
export { Col, Free, Graph, Grid, Group, Row, type ColProps, type FreeProps, type GraphProps, type GridProps, type GroupProps, type RowProps } from "./marks/layout";
export { Node, nodeTitleW, type NodeProps } from "./marks/node";
export { Dot, Path, Poly, Space, type DotProps, type PathProps, type PolyProps, type SpaceProps } from "./marks/shapes";
export { Dots, Tag, Text, type DotsProps, type TagProps, type TextProps } from "./marks/text";
export { measure } from "./measure";
export * from "./model";
export { labelPillW } from "./route";
export { CELL, FONT, GROUP, LABEL_CLEAR, MAX_CONTENT_W, NODE, STROKE, TABLE, TAG } from "./theme";

/** Everything an MDX author needs, keyed by tag name. */
export const figureComponents = { Diagram, Row, Col, Grid, Group, Graph, Free, Space, Node, Cells, Table, Text, Tag, Dots, Poly, Path, Dot, Edge };
