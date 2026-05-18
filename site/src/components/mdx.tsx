import type { MDXComponents } from "mdx/types";
import { Callout } from "./Callout";
import { R2Image } from "./R2Image";
import { DemoFrame } from "./DemoFrame";
import { DrawerDemo } from "./DrawerDemo";

/**
 * Component map passed to next-mdx-remote. Anything an author writes as
 * a JSX tag inside a note is resolved against this map first, so notes
 * can drop `<Callout>...</Callout>` or `<DrawerDemo />` without an
 * explicit import in the .mdx file.
 */
export const mdxComponents: MDXComponents = {
  Callout,
  R2Image,
  DemoFrame,
  DrawerDemo,
};
