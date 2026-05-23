"use client";

import dynamic from "next/dynamic";

export const CodePlayground = dynamic(
  () => import("./CodePlaygroundImpl").then((m) => m.CodePlayground),
  { ssr: false },
);
