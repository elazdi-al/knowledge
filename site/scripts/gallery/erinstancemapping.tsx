import { ERInstanceMapping } from "@/components/ERInstanceMapping";

export const name = "ERInstanceMapping";

export const examples = [
  // Works_In relationship instance (L1.tex, er_works_in_instance.tex).
  // Three grouped sets: Employees (ssn tuples) → Works_In (date tuples) →
  // Departments (did tuples). Each polyline is one stored relationship row:
  //   (employee ssn, department did, since-date).
  <ERInstanceMapping
    key="works-in"
    left={{
      label: "Employees",
      anchor: "right",
      items: [
        { id: "e1", value: "123-22-3666" },
        { id: "e2", value: "231-31-5368" },
        { id: "e3", value: "131-24-3650" },
        { id: "e4", value: "223-32-6316" },
      ],
    }}
    mid={{
      label: "Works_In",
      itemStyle: "bare",
      anchor: "center",
      items: [
        { id: "w1", value: "1/1/91" },
        { id: "w2", value: "3/3/93" },
        { id: "w3", value: "2/2/92" },
        { id: "w4", value: "3/1/92" },
        { id: "w5", value: "3/1/92" },
      ],
    }}
    right={{
      label: "Departments",
      anchor: "left",
      items: [
        { id: "d1", value: "51" },
        { id: "d2", value: "56" },
        { id: "d3", value: "60" },
      ],
    }}
    links={[
      { left: "e1", mid: "w1", right: "d1" },
      { left: "e2", mid: "w2", right: "d2" },
      { left: "e2", mid: "w3", right: "d2" },
      { left: "e3", mid: "w4", right: "d3" },
      { left: "e4", mid: "w5", right: "d3" },
    ]}
    caption="Instance of Works_In(ssn, did, since): each line links an employee tuple to a department tuple via a date tuple, so every relationship row is shown as a concrete association between participating entity instances."
  />,
];
