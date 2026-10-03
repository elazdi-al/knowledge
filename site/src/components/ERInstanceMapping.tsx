import { Col, Diagram, Edge, Group, Node, Row } from "@/components/figure";

/**
 * An ER *relationship-instance* illustration: three sets side by side (left
 * entity, relationship, right entity), each holding concrete value tuples,
 * and one link per relationship tuple threading entity to relationship to
 * entity. Not an ER schema diagram (that is <ERDiagram>): every box is a
 * stored value and every line is one row of the relationship instance.
 */

/** A value tuple inside a set. `value` is the displayed text (e.g. an ssn,
 *  a did, or a date string). */
export interface ERValue {
  /** Stable id referenced by links. */
  id: string;
  /** Displayed tuple text. */
  value: string;
}

/** Visual style of a set's value items. */
export type ERItemStyle =
  /** Value box with a hairline border (Employees ssn, Departments did). */
  | "box"
  /** Kept for existing notes; drawn as a box like the rest, so every link ends on an edge. */
  | "bare";

export interface ERSet {
  /** Bold heading rendered beneath the group. */
  label: string;
  /** Member value tuples, top to bottom. */
  items: ERValue[];
  /** How each item is drawn. Default "box". */
  itemStyle?: ERItemStyle;
  /** Which inner edge the anchor dots sit on, relative to the group:
   *  "right" (dots on the right of the boxes - a left entity set),
   *  "left" (dots on the left - a right entity set),
   *  "center" (dots centred under the text - the middle relationship set). */
  anchor?: "left" | "right" | "center";
}

/** One relationship-instance row: a member of the middle set linked to a
 *  member of each entity set. */
export interface ERLink {
  /** id of an item in the left set. */
  left: string;
  /** id of an item in the middle (relationship) set. */
  mid: string;
  /** id of an item in the right set. */
  right: string;
}

interface Props {
  /** Left entity set (e.g. Employees). */
  left: ERSet;
  /** Middle relationship set (e.g. Works_In). */
  mid: ERSet;
  /** Right entity set (e.g. Departments). */
  right: ERSet;
  /** Relationship-instance rows threading left to mid to right. */
  links: ERLink[];
  /** Bold heading inside the card (e.g. "Before"). */
  title?: string;
  caption?: string;
  className?: string;
}

/** Set names are literal identifiers: `Works_In` keeps its low line. */
const literal = (s: string) => s.replace(/[_^]/g, "\\$&");

function SetPanel({ set }: { set: ERSet }) {
  return (
    <Group title={literal(set.label)}>
      <Col gap={10}>
        {set.items.map((it) => (
          <Node key={it.id} id={it.id} title={it.value} mono />
        ))}
      </Col>
    </Group>
  );
}

const link = (from: string, to: string) => <Edge key={`${from}>${to}`} from={from} to={to} fromSide="right" toSide="left" route="straight" head="none" />;

export function ERInstanceMapping({ left, mid, right, links, title, caption, className }: Props) {
  return (
    <Diagram title={title} caption={caption} className={className}>
      <Row gap={72}>
        <SetPanel set={left} />
        <SetPanel set={mid} />
        <SetPanel set={right} />
      </Row>
      {links.flatMap((l) => [link(l.left, l.mid), link(l.mid, l.right)])}
    </Diagram>
  );
}
