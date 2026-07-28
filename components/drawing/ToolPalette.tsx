"use client";

import type { ReactNode } from "react";
import type { PaneOpening } from "@/lib/design-items";

export type ToolId =
  | "split-v"
  | "split-h"
  | "split-v2"
  | PaneOpening;

type ToolDef = {
  id: ToolId;
  label: string;
  icon: ReactNode;
};

type Props = {
  activeOpening?: PaneOpening | null;
  onTool: (id: ToolId) => void;
};

const tools: ToolDef[] = [
  {
    id: "split-v",
    label: "تقسيم رأسي",
    icon: <LineV />,
  },
  {
    id: "split-h",
    label: "تقسيم أفقي",
    icon: <LineH />,
  },
  {
    id: "split-v2",
    label: "تقسيم لعمودين",
    icon: <LineV2 />,
  },
  {
    id: "fixed",
    label: "ثابت",
    icon: <IconFixed />,
  },
  {
    id: "exhaust",
    label: "شفاط",
    icon: <IconExhaust />,
  },
  {
    id: "casement-left",
    label: "ضلفة يسار",
    icon: <IconCasementLeft />,
  },
  {
    id: "casement-right",
    label: "ضلفة يمين",
    icon: <IconCasementRight />,
  },
  {
    id: "tilt",
    label: "قلب علوي",
    icon: <IconTilt />,
  },
  {
    id: "tilt-inverted",
    label: "قلاب معكوس",
    icon: <IconTiltInverted />,
  },
  {
    id: "tilt-turn",
    label: "قلب وضلفة",
    icon: <IconTiltTurn />,
  },
  {
    id: "drawer-left",
    label: "جرار شمال",
    icon: <IconDrawerLeft />,
  },
  {
    id: "drawer-right",
    label: "جرار يمين",
    icon: <IconDrawerRight />,
  },
  {
    id: "panel-h",
    label: "بانل أفقي",
    icon: <IconPanelH />,
  },
  {
    id: "panel-v",
    label: "بانل رأسي",
    icon: <IconPanelV />,
  },
];

export function ToolPalette({ activeOpening, onTool }: Props) {
  return (
    <div className="rounded-[24px] border border-border bg-card px-2 py-2 shadow-[0_10px_30px_rgba(15,20,28,0.06)]">
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1.5">
        {tools.map((tool) => {
          const active =
            activeOpening != null && tool.id === activeOpening;
          return (
            <button
              key={tool.id}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={active}
              onClick={() => onTool(tool.id)}
              className={`flex aspect-square items-center justify-center rounded-2xl border transition-all ${
                active
                  ? "border-primary bg-primary-soft text-primary shadow-sm"
                  : "border-transparent bg-background text-primary hover:border-border hover:bg-primary-soft/60"
              }`}
            >
              {tool.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function LineV() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <line x1="16" y1="5" x2="16" y2="27" />
    </Svg>
  );
}

function LineH() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <line x1="6" y1="16" x2="26" y2="16" />
    </Svg>
  );
}

function LineV2() {
  return (
    <Svg>
      <rect x="5" y="5" width="22" height="22" rx="1" />
      <line x1="12.5" y1="5" x2="12.5" y2="27" />
      <line x1="19.5" y1="5" x2="19.5" y2="27" />
    </Svg>
  );
}

function IconFixed() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <line x1="10" y1="9" x2="22" y2="23" />
      <line x1="22" y1="9" x2="10" y2="23" />
    </Svg>
  );
}

function IconExhaust() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <circle cx="16" cy="16" r="7" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <path d="M16 9.5 Q20.5 12 19.5 16 Q18 11 16 9.5 M16 9.5 Q11.5 12 12.5 16 Q14 11 16 9.5 M19.5 16 Q20.5 20 16 22.5 Q18 18 19.5 16 M12.5 16 Q11.5 20 16 22.5 Q14 18 12.5 16" />
    </Svg>
  );
}

function IconCasementLeft() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <path d="M22 7 L10 16 L22 25" />
    </Svg>
  );
}

function IconCasementRight() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <path d="M10 7 L22 16 L10 25" />
    </Svg>
  );
}

function IconTilt() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <path d="M8 24 L16 10 L24 24" />
    </Svg>
  );
}

function IconTiltInverted() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <path d="M8 10 L16 24 L24 10" />
    </Svg>
  );
}

function IconTiltTurn() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <path d="M8 24 L16 10 L24 24" />
      <path d="M22 8 L10 16 L22 24" opacity="0.7" />
    </Svg>
  );
}

function IconDrawerLeft() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <path d="M14 12.5 L10 16 L14 19.5 M10 16 H22 V21" />
    </Svg>
  );
}

function IconDrawerRight() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <path d="M18 12.5 L22 16 L18 19.5 M22 16 H10 V21" />
    </Svg>
  );
}

function IconPanelH() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <rect x="8" y="8" width="16" height="4" fill="currentColor" opacity="0.35" rx="0.5" />
      <rect x="8" y="14" width="16" height="4" fill="currentColor" opacity="0.35" rx="0.5" />
      <rect x="8" y="20" width="16" height="4" fill="currentColor" opacity="0.35" rx="0.5" />
    </Svg>
  );
}

function IconPanelV() {
  return (
    <Svg>
      <rect x="6" y="5" width="20" height="22" rx="1" />
      <rect x="8" y="7" width="4" height="18" fill="currentColor" opacity="0.35" rx="0.5" />
      <rect x="14" y="7" width="4" height="18" fill="currentColor" opacity="0.35" rx="0.5" />
      <rect x="20" y="7" width="4" height="18" fill="currentColor" opacity="0.35" rx="0.5" />
    </Svg>
  );
}
