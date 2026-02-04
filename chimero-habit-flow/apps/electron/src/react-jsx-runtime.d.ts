/**
 * Declares react/jsx-runtime so tsc can type-check JSX in packages/ui when
 * moduleResolution does not resolve the react package subpath.
 */
declare module "react/jsx-runtime" {
  import type { ReactElement, ReactNode } from "react";
  export function jsx(type: unknown, props: unknown, key?: string): ReactElement;
  export function jsxs(type: unknown, props: unknown, key?: string): ReactElement;
  export const Fragment: ReactNode;
}
