import { Automaton, Curve, Fit, Plot, Scatter, SequenceChart, Series, TimeSpace, Tree } from "./kits";
import { Brace, Canvas, Cells, Circle, Col, Dot, Dots, Edge, Ellipse, Graph, Grid, Group, Legend, Line, Node, Path, Poly, Row, Space, Svg, Table, Tag, Text } from "./marks";
import { Diagram } from "./Diagram";

export { Diagram, type DiagramProps, type FigureProps } from "./Diagram";
export * from "./core";
export * from "./kits";
export * from "./marks";

/** Everything an MDX author needs, keyed by tag name. */
export const figureComponents = { Diagram, Row, Col, Grid, Group, Graph, Tree, Plot, Scatter, Curve, Series, Canvas, Fit, Space, Node, Cells, Table, Text, Tag, Dots, Legend, Poly, Path, Line, Circle, Ellipse, Dot, Svg, Edge, Brace, Automaton, SequenceChart, TimeSpace };
