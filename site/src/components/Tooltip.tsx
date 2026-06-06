"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  label: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  /** Open delay in ms. Omit to inherit the Base UI / Provider default (600ms). */
  delay?: number;
  children: ReactElement;
  className?: string;
}

export function Tooltip({
  label,
  side = "top",
  sideOffset = 6,
  delay,
  children,
  className,
}: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger delay={delay} render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={sideOffset}>
          <BaseTooltip.Popup className={cn("tooltip-popup", className)}>
            {label}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

export const TooltipProvider = BaseTooltip.Provider;
