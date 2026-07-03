"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/components/ui/collapsible";
import { cn } from "src/lib/utils";
import type { LucideIcon } from "lucide-react";
import { BrainIcon, ChevronDownIcon, DotIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, memo, useContext, useMemo, useRef, useEffect } from "react";

interface ChainOfThoughtContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null
);

const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought"
    );
  }
  return context;
};

export type ChainOfThoughtProps = ComponentProps<"div"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ChainOfThought = memo(
  ({
    className,
    open,
    defaultOpen = false,
    onOpenChange,
    children,
    ...props
  }: ChainOfThoughtProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      defaultProp: defaultOpen,
      onChange: onOpenChange,
      prop: open,
    });

    const chainOfThoughtContext = useMemo(
      () => ({ isOpen, setIsOpen }),
      [isOpen, setIsOpen]
    );

    return (
      <ChainOfThoughtContext.Provider value={chainOfThoughtContext}>
        <div className={cn("not-prose w-full space-y-4", className)} {...props}>
          {children}
        </div>
      </ChainOfThoughtContext.Provider>
    );
  }
);

export type ChainOfThoughtHeaderProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  icon?: ReactNode;
};

export const ChainOfThoughtHeader = memo(
  ({ className, children, icon, ...props }: ChainOfThoughtHeaderProps) => {
    const { isOpen, setIsOpen } = useChainOfThought();

    return (
      <Collapsible onOpenChange={setIsOpen} open={isOpen} className="w-full">
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
            className
          )}
          {...props}
        >
          {icon ?? <BrainIcon className="size-4" />}
          <span className="flex-1 text-left">
            {children ?? "Chain of Thought"}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform",
              isOpen ? "rotate-180" : "rotate-0"
            )}
          />
        </CollapsibleTrigger>
      </Collapsible>
    );
  }
);

export type ChainOfThoughtStepProps = ComponentProps<"div"> & {
  icon?: LucideIcon;
  label: ReactNode;
  description?: ReactNode;
  status?: "complete" | "active" | "pending";
};

const stepStatusStyles = {
  active: "text-foreground",
  complete: "text-muted-foreground",
  pending: "text-muted-foreground/50",
};

export const ChainOfThoughtStep = memo(
  ({
    className,
    icon: Icon = DotIcon,
    label,
    description,
    status = "complete",
    children,
    ...props
  }: ChainOfThoughtStepProps) => (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        stepStatusStyles[status],
        "fade-in-0 animate-in",
        className
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0" />
      <div className="truncate flex-1">
        {label}
        {description && (
          <span className="text-muted-foreground/60 ml-2 text-xs truncate">{description}</span>
        )}
      </div>
      {children}
    </div>
  )
);

export type ChainOfThoughtContentProps = ComponentProps<
  typeof CollapsibleContent
>;

export const ChainOfThoughtContent = memo(
  ({ className, children, ...props }: ChainOfThoughtContentProps) => {
    const { isOpen } = useChainOfThought();
    const scrollRef = useRef<HTMLDivElement>(null);
    const topFadeRef = useRef<HTMLDivElement>(null);
    const bottomFadeRef = useRef<HTMLDivElement>(null);

    const updateFades = () => {
      const el = scrollRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (topFadeRef.current)
        topFadeRef.current.style.opacity = Math.min(scrollTop / 20, 1).toString();
      if (bottomFadeRef.current)
        bottomFadeRef.current.style.opacity = Math.min(
          Math.max(scrollHeight - clientHeight - scrollTop - 16, 0) / 10,
          1,
        ).toString();
    };

    useEffect(() => {
      const el = scrollRef.current;
      if (!el || !isOpen) return;
      updateFades();
      el.addEventListener("scroll", updateFades);
      const ro = new ResizeObserver(updateFades);
      ro.observe(el);
      return () => {
        el.removeEventListener("scroll", updateFades);
        ro.disconnect();
      };
    }, [isOpen]);

    return (
      <Collapsible open={isOpen} className="w-full">
        <CollapsibleContent
          className={cn(
            "mt-2 max-h-96 overflow-hidden text-popover-foreground outline-none data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=open]:animate-in",
            className
          )}
          {...props}
        >
          <div className="relative">
            <div
              ref={scrollRef}
              className="max-h-96 overflow-y-auto scrollbar-none space-y-3"
              onScroll={updateFades}
            >
              {children}
            </div>
            <div
              ref={topFadeRef}
              className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background via-background/90 to-transparent"
              style={{ opacity: 0 }}
            />
            <div
              ref={bottomFadeRef}
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background via-background/90 to-transparent"
              style={{ opacity: 0 }}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
);
ChainOfThought.displayName = "ChainOfThought";
ChainOfThoughtHeader.displayName = "ChainOfThoughtHeader";
ChainOfThoughtStep.displayName = "ChainOfThoughtStep";
ChainOfThoughtContent.displayName = "ChainOfThoughtContent";
