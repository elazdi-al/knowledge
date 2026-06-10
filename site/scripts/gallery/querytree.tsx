import { QueryTree } from "@/components/QueryTree";

export const name = "QueryTree";

/**
 * EPFL "Data Intensive Systems" L2 — the query "Find the names of all
 * instructors in the Music department together with the course title of all the
 * courses that they teach." Both trees compute the same result; (b) is far more
 * efficient because the σ is pushed below the join, filtering instructor before
 * the expensive join. The highlighted node is the σ the prose tracks across the
 * rewrite (it replaces the red ellipse in the TikZ sources).
 */
export const examples = [
  // (a) tree_initial.tex — σ applied AFTER joining all three relations.
  <QueryTree
    key="initial"
    title="Initial"
    caption="(a) Initial: σ applied after joining all three relations — every tuple is processed."
    nodes={[
      { id: "pi", op: "project", sub: "name, title" },
      { id: "sigma", op: "select", sub: 'dept_name = "Music"', state: "highlight" },
      { id: "join1", op: "join" },
      { id: "instructor", relation: "instructor" },
      { id: "join2", op: "join" },
      { id: "teaches", relation: "teaches" },
      { id: "picourse", op: "project", sub: "course_id, title" },
      { id: "course", relation: "course" },
    ]}
    links={[
      { parent: "pi", child: "sigma" },
      { parent: "sigma", child: "join1" },
      { parent: "join1", child: "instructor" },
      { parent: "join1", child: "join2" },
      { parent: "join2", child: "teaches" },
      { parent: "join2", child: "picourse" },
      { parent: "picourse", child: "course" },
    ]}
  />,

  // (b) tree_optimized.tex — σ pushed DOWN onto instructor, before the join.
  <QueryTree
    key="optimized"
    title="Optimized"
    caption="(b) Optimized: σ pushed down to filter instructor before the join — far fewer tuples flow upward."
    nodes={[
      { id: "pi", op: "project", sub: "name, title" },
      { id: "join1", op: "join" },
      { id: "sigma", op: "select", sub: 'dept_name = "Music"', state: "highlight" },
      { id: "join2", op: "join" },
      { id: "instructor", relation: "instructor" },
      { id: "teaches", relation: "teaches" },
      { id: "picourse", op: "project", sub: "course_id, title" },
      { id: "course", relation: "course" },
    ]}
    links={[
      { parent: "pi", child: "join1" },
      { parent: "join1", child: "sigma" },
      { parent: "join1", child: "join2" },
      { parent: "sigma", child: "instructor" },
      { parent: "join2", child: "teaches" },
      { parent: "join2", child: "picourse" },
      { parent: "picourse", child: "course" },
    ]}
  />,
];
