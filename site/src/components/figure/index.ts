import { Diagram } from "./Diagram";
import { Cells, Col, Dots, Edge, Free, Graph, Grid, Group, Node, Row, Space, Table, Tag, Text } from "./primitives";

export { Diagram, type DiagramProps } from "./Diagram";
export {
  Cells,
  Col,
  Dots,
  Edge,
  Free,
  Graph,
  Grid,
  Group,
  Node,
  Row,
  Space,
  Table,
  Tag,
  Text,
  toScene,
  type CellInput,
  type CellsProps,
  type EdgeProps,
  type GraphProps,
  type GridProps,
  type GroupProps,
  type NodeProps,
  type RowProps,
  type TableProps,
  type TagProps,
  type TextProps,
} from "./primitives";
export { layoutScene } from "./layout";
export { routeEdges } from "./route";
export { FrameSvg } from "./render";
export { measure } from "./measure";
export { Label, parseLabel, plainLabel, normalizeLabel } from "./text";
export * from "./model";
export { FONT, MAX_CONTENT_W, NODE, STROKE } from "./theme";

/** Everything an MDX author needs, keyed by tag name. */
export const figureComponents = { Diagram, Row, Col, Grid, Group, Graph, Free, Space, Node, Cells, Table, Text, Tag, Dots, Edge };
