import { StorageHierarchy } from "@/components/StorageHierarchy";

export const name = "StorageHierarchy";

export const examples = [
  // The L3 storage_hierarchy figure: Database → File → Page → Record, each a
  // container of inner boxes, joined by flow arrows. The Record stage lays its
  // fields out horizontally with a "Fields" sublabel.
  <StorageHierarchy
    key="hierarchy"
    stages={[
      {
        title: "Database",
        items: ["File A", "File B", "File C"],
      },
      {
        title: "File",
        items: ["Page 0", "Page 1", "Page 2", "Page 3"],
      },
      {
        title: "Page",
        items: ["Record 0", "Record 1", "Record 2", "Record 3"],
      },
      {
        title: "Record",
        layout: "row",
        items: ["id", "name", "dept", "gpa"],
        note: "Fields",
      },
    ]}
    caption="Storage hierarchy: a database is a set of files, a file is a set of pages, a page stores records, and a record is a sequence of fields."
  />,

  // The same chain with one element highlighted per stage, tracing a point
  // access down the hierarchy: a chosen file, page, record, and field.
  <StorageHierarchy
    key="point-access"
    stages={[
      {
        title: "Database",
        items: [
          "File A",
          { label: "File B", state: "highlight" },
          "File C",
        ],
      },
      {
        title: "File",
        items: [
          "Page 0",
          "Page 1",
          { label: "Page 2", state: "highlight" },
          "Page 3",
        ],
      },
      {
        title: "Page",
        items: [
          "Record 0",
          { label: "Record 1", state: "highlight" },
          "Record 2",
          "Record 3",
        ],
      },
      {
        title: "Record",
        layout: "row",
        items: [
          "id",
          { label: "name", state: "highlight" },
          "dept",
          "gpa",
        ],
        note: "Fields",
      },
    ]}
    caption="Point access traces one path down the hierarchy: a single file, page, record, and field are selected at each level."
  />,
];
