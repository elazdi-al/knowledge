import { ERDiagram } from "@/components/ERDiagram";

export const name = "ERDiagram";

/**
 * One <ERDiagram /> per source figure from the EPFL "Data Intensive Systems"
 * L1 schemas, faithfully reproducing each TikZ layout. Coordinates are the same
 * y-up centimetre grid as the .tex sources; the component flips to SVG space.
 * These double as the living usage docs for the lecture MDX.
 */
export const examples = [
  // er_entity_set_employees.tex — a single entity set with three attributes,
  // ssn underlined as the key.
  <ERDiagram
    key="entity-set"
    caption="An entity set Employees with attributes; ssn is the key (solid underline)."
    entities={[{ id: "emp", label: "Employees", x: 0, y: 0 }]}
    attributes={[
      { owner: "emp", label: "ssn", x: -2.0, y: 1.1, kind: "key" },
      { owner: "emp", label: "name", x: 0, y: 1.7 },
      { owner: "emp", label: "lot", x: 2.0, y: 1.1 },
    ]}
  />,

  // er_works_in_schema.tex — two entities joined by a relationship diamond,
  // each carrying its own attributes plus a relationship attribute "since".
  <ERDiagram
    key="works-in"
    caption="The Works_In relationship set between Employees and Department, with a descriptive attribute since."
    entities={[
      { id: "emp", label: "Employees", x: 0, y: 0 },
      { id: "dep", label: "Department", x: 7.6, y: 0 },
    ]}
    relationships={[{ id: "works", label: "Works_In", x: 3.8, y: 0 }]}
    attributes={[
      { owner: "emp", label: "ssn", x: -1.8, y: 0.85, kind: "key" },
      { owner: "emp", label: "name", x: 0, y: 1.55 },
      { owner: "emp", label: "lot", x: 1.8, y: 0.85 },
      { owner: "works", label: "since", x: 3.8, y: 1.55 },
      { owner: "dep", label: "did", x: 5.8, y: 0.85, kind: "key" },
      { owner: "dep", label: "dname", x: 7.6, y: 1.55 },
      { owner: "dep", label: "budget", x: 9.4, y: 0.85 },
    ]}
    edges={[
      { from: "emp", to: "works" },
      { from: "works", to: "dep" },
    ]}
  />,

  // er_reports_to_roles.tex — the same as Works_In, plus a self-relationship
  // Reports_To on Employees with supervisor / subordinate role labels.
  <ERDiagram
    key="reports-to"
    caption="Reports_To is a self-relationship on Employees: the same entity set participates twice, under the roles supervisor and subordinate."
    entities={[
      { id: "emp", label: "Employees", x: 0, y: 0 },
      { id: "dep", label: "Department", x: 7.6, y: 0 },
    ]}
    relationships={[
      { id: "works", label: "Works_In", x: 3.8, y: 0 },
      { id: "reports", label: "Reports_To", x: 0, y: -2.2 },
    ]}
    attributes={[
      { owner: "emp", label: "ssn", x: -1.8, y: 0.85, kind: "key" },
      { owner: "emp", label: "name", x: 0, y: 1.55 },
      { owner: "emp", label: "lot", x: 1.8, y: 0.85 },
      { owner: "works", label: "since", x: 3.8, y: 1.55 },
      { owner: "dep", label: "did", x: 5.8, y: 0.85, kind: "key" },
      { owner: "dep", label: "dname", x: 7.6, y: 1.55 },
      { owner: "dep", label: "budget", x: 9.4, y: 0.85 },
    ]}
    edges={[
      { from: "emp", to: "works" },
      { from: "works", to: "dep" },
      { from: "emp", to: "reports", label: "supervisor" },
      { from: "emp", to: "reports", label: "subordinate" },
    ]}
  />,

  // er_key_constraints.tex — three small schemas stacked, showing cardinality
  // via stealth arrowheads (an arrow = at most one / key constraint).
  <ERDiagram
    key="key-constraints"
    caption="Key constraints: no arrow (many-to-many), one arrow (one-to-many), arrows on both sides (one-to-one). An arrowhead means at most one."
    entities={[
      { id: "e1", label: "Employees", x: 0, y: 0 },
      { id: "d1", label: "Department", x: 6.8, y: 0 },
      { id: "e2", label: "Employees", x: 0, y: -2.0 },
      { id: "d2", label: "Department", x: 6.8, y: -2.0 },
      { id: "e3", label: "Driver", x: 0, y: -4.0 },
      { id: "d3", label: "Vehicle", x: 6.8, y: -4.0 },
    ]}
    relationships={[
      { id: "r1", label: "Works_In", x: 3.4, y: 0 },
      { id: "r2", label: "Manages", x: 3.4, y: -2.0 },
      { id: "r3", label: "Drives", x: 3.4, y: -4.0 },
    ]}
    edges={[
      { from: "e1", to: "r1" },
      { from: "r1", to: "d1" },
      { from: "e2", to: "r2" },
      { from: "d2", to: "r2", style: "arrow" },
      { from: "e3", to: "r3", style: "arrow" },
      { from: "d3", to: "r3", style: "arrow" },
    ]}
    annotations={[
      { text: "Many-to-Many", x: 9.5, y: 0, anchor: "start" },
      { text: "One-to-Many", x: 9.5, y: -2.0, anchor: "start" },
      { text: "One-to-One", x: 9.5, y: -4.0, anchor: "start" },
    ]}
  />,

  // er_participation_constraints.tex — thick lines for total participation,
  // thick entity borders, and a combined thick stealth arrow (partial + key).
  <ERDiagram
    key="participation"
    caption="Participation constraints: a thick line means total participation (every entity participates); a thin line is partial. The thick border and thick arrow on Manages combine total participation with a key constraint."
    entities={[
      { id: "e1", label: "Employees", x: 0, y: 0, variant: "weak" },
      { id: "d1", label: "Department", x: 6.8, y: 0, variant: "weak" },
      { id: "e2", label: "Employees", x: 0, y: -2.2 },
      { id: "d2", label: "Department", x: 6.8, y: -2.2, variant: "weak" },
      { id: "e3", label: "Customer", x: 0, y: -4.4 },
      { id: "d3", label: "Products", x: 6.8, y: -4.4 },
    ]}
    relationships={[
      { id: "r1", label: "Works_In", x: 3.4, y: 0 },
      { id: "r2", label: "Manages", x: 3.4, y: -2.2 },
      { id: "r3", label: "Buys", x: 3.4, y: -4.4 },
    ]}
    edges={[
      { from: "e1", to: "r1", style: "thick" },
      { from: "r1", to: "d1", style: "thick" },
      { from: "e2", to: "r2", style: "arrow" },
      { from: "d2", to: "r2", style: "thickArrow" },
      { from: "e3", to: "r3" },
      { from: "r3", to: "d3" },
    ]}
    annotations={[
      { text: "Total: every entity participates", x: 8.4, y: 0, anchor: "start" },
      { text: "Partial + key constraint", x: 8.4, y: -2.2, anchor: "start" },
      { text: "Partial: entities may not participate", x: 8.4, y: -4.4, anchor: "start" },
    ]}
  />,

  // er_weak_entity.tex — a weak entity (thick border) tied to its owner through
  // an identifying relationship (thick diamond); pname is a partial key.
  <ERDiagram
    key="weak-entity"
    caption="Dependents is a weak entity (thick border) owned by Employees through the identifying relationship Policy (thick diamond). pname is a partial key (dashed underline); the thick arrow marks total participation with a key constraint."
    entities={[
      { id: "emp", label: "Employees", x: 0, y: 0 },
      { id: "dep", label: "Dependents", x: 8.0, y: 0, variant: "weak" },
    ]}
    relationships={[
      { id: "pol", label: "Policy", x: 4.0, y: 0, variant: "identifying" },
    ]}
    attributes={[
      { owner: "emp", label: "ssn", x: -1.8, y: 0.85, kind: "key" },
      { owner: "emp", label: "name", x: 0, y: 1.55 },
      { owner: "emp", label: "lot", x: 1.8, y: 0.85 },
      { owner: "pol", label: "cost", x: 4.0, y: 1.55 },
      { owner: "dep", label: "pname", x: 6.7, y: 0.85, kind: "partial" },
      { owner: "dep", label: "age", x: 9.3, y: 0.85 },
    ]}
    edges={[
      { from: "emp", to: "pol" },
      { from: "dep", to: "pol", style: "thickArrow" },
    ]}
  />,

  // er_isa_hierarchy.tex — an ISA triangle splitting Employees into two
  // subclasses that inherit the superclass attributes and add their own.
  <ERDiagram
    key="isa-hierarchy"
    caption="An ISA hierarchy: Hourly_Emps and Contract_Emps inherit ssn, name, lot from Employees and add their own attributes."
    entities={[
      { id: "emp", label: "Employees", x: 0, y: 0 },
      { id: "hourly", label: "Hourly_Emps", x: -2.5, y: -3.2 },
      { id: "contract", label: "Contract_Emps", x: 2.5, y: -3.2 },
    ]}
    isa={[{ id: "isa", x: 0, y: -1.6 }]}
    attributes={[
      { owner: "emp", label: "ssn", x: -2.0, y: 0.85, kind: "key" },
      { owner: "emp", label: "name", x: 0, y: 1.55 },
      { owner: "emp", label: "lot", x: 2.0, y: 0.85 },
      { owner: "hourly", label: "hourly_wages", x: -6, y: -2.0 },
      { owner: "hourly", label: "hours_worked", x: -2.5, y: -2.0 },
      { owner: "contract", label: "contractid", x: 4.3, y: -2.35 },
    ]}
    edges={[
      { from: "emp", to: "isa" },
      { from: "isa", to: "hourly" },
      { from: "isa", to: "contract" },
    ]}
  />,

  // er_isa_student.tex — a deep, multi-branch ISA tree: two overlapping ISA
  // branches off Student, a nested ISA under Post-Graduate, and relationships
  // hanging off the leaf subclasses.
  <ERDiagram
    key="isa-student"
    caption="A deep ISA tree: Student specializes by degree and by status (two overlapping branches), Post-Graduate further splits into Master and Doctorate, and leaf subclasses join their own relationships."
    entities={[
      { id: "stu", label: "Student", x: 6.6, y: 0 },
      { id: "crs", label: "Courses", x: 13.0, y: 0 },
      { id: "bach", label: "Bachelor", x: 0.6, y: -3.2 },
      { id: "pg", label: "Post-Grad.", x: 5.2, y: -3.2 },
      { id: "ft", label: "Full-time", x: 9.3, y: -3.2 },
      { id: "pt", label: "Part-time", x: 12.4, y: -3.2 },
      { id: "proj", label: "Project", x: 0.6, y: -6.4 },
      { id: "msc", label: "Master", x: 3.6, y: -6.4 },
      { id: "phd", label: "Doctorate", x: 6.6, y: -6.4 },
      { id: "thes", label: "Thesis", x: 9.6, y: -6.4 },
    ]}
    relationships={[
      { id: "enr", label: "Enrolls", x: 9.8, y: 0 },
      { id: "reg1", label: "Registers", x: 0.6, y: -4.8 },
      { id: "reg2", label: "Registers", x: 9.6, y: -4.8 },
    ]}
    isa={[
      { id: "isa1", x: 3.4, y: -1.6 },
      { id: "isa2", x: 10.8, y: -1.6 },
      { id: "isa3", x: 5.2, y: -4.8 },
    ]}
    edges={[
      { from: "stu", to: "enr" },
      { from: "enr", to: "crs" },
      { from: "stu", to: "isa1" },
      { from: "stu", to: "isa2" },
      { from: "isa1", to: "bach" },
      { from: "isa1", to: "pg" },
      { from: "isa2", to: "ft" },
      { from: "isa2", to: "pt" },
      { from: "bach", to: "reg1" },
      { from: "reg1", to: "proj" },
      { from: "pg", to: "isa3" },
      { from: "isa3", to: "msc" },
      { from: "isa3", to: "phd" },
      { from: "pg", to: "reg2" },
      { from: "reg2", to: "thes" },
    ]}
    annotations={[
      { text: "Overlapping", x: 6.6, y: -0.8 },
      { text: "Non-Overl.", x: 2.45, y: -1.6, anchor: "end" },
      { text: "Non-Overl.", x: 11.8, y: -1.6, anchor: "start" },
      { text: "Non-Overl.", x: 4.25, y: -4.8, anchor: "end" },
    ]}
  />,

  // er_aggregation.tex — the Sponsors relationship (with Projects + Departments
  // and their attributes) is enclosed in a dashed box, which then participates
  // in Monitors with an Employee.
  <ERDiagram
    key="aggregation"
    caption="Aggregation: the Sponsors relationship together with Projects and Departments is enclosed in a dashed box and treated as a single entity set, which then participates in Monitors with an Employee."
    entities={[
      { id: "proj", label: "Projects", x: 0, y: 0 },
      { id: "dept", label: "Departments", x: 8.0, y: 0 },
      { id: "emp", label: "Employee", x: 4.0, y: -3.5 },
    ]}
    relationships={[
      { id: "spon", label: "Sponsors", x: 4.0, y: 0 },
      { id: "mon", label: "Monitors", x: 4.0, y: -2.0 },
    ]}
    attributes={[
      { owner: "proj", label: "pid", x: -1.8, y: 0.85, kind: "key" },
      { owner: "proj", label: "name", x: 0, y: 1.55 },
      { owner: "proj", label: "lot", x: 1.8, y: 0.85 },
      { owner: "spon", label: "since", x: 4.0, y: 1.55 },
      { owner: "dept", label: "did", x: 6.5, y: 0.85, kind: "key" },
      { owner: "dept", label: "dname", x: 8.0, y: 1.55 },
      { owner: "dept", label: "budget", x: 9.5, y: 0.85 },
    ]}
    aggregations={[{ id: "agg", members: ["proj", "spon", "dept"] }]}
    edges={[
      { from: "proj", to: "spon" },
      { from: "spon", to: "dept" },
      { from: "agg", to: "mon" },
      { from: "mon", to: "emp" },
    ]}
  />,
];
