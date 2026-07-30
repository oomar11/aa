import Link from "next/link";
import type { MaterialWorkflowStep } from "@/lib/materials-navigation";

type Props = {
  steps: MaterialWorkflowStep[];
  className?: string;
};

/** يوضح ترتيب العمل: براندات ← أنظمة ← تفاصيل */
export function MaterialWorkflowGuide({ steps, className }: Props) {
  return (
    <ol
      className={`grid grid-cols-2 gap-2 ${className ?? ""}`}
      aria-label="خطوات الإعداد"
    >
      {steps.map((step) => {
        const content = (
          <>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                step.active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/20 text-muted"
              }`}
            >
              {step.step}
            </span>
            <div className="min-w-0 text-right">
              <p
                className={`text-xs font-semibold ${
                  step.active ? "text-primary" : "text-foreground"
                }`}
              >
                {step.title}
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                {step.description}
              </p>
            </div>
          </>
        );

        if (step.href && !step.active) {
          return (
            <li key={step.step}>
              <Link
                href={step.href}
                className="flex h-full items-start gap-2 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-primary/40 hover:bg-primary-soft/20"
              >
                {content}
              </Link>
            </li>
          );
        }

        return (
          <li
            key={step.step}
            className={`flex items-start gap-2 rounded-xl border p-2.5 ${
              step.active
                ? "border-primary/50 bg-primary-soft/30"
                : "border-border bg-card"
            }`}
            aria-current={step.active ? "step" : undefined}
          >
            {content}
          </li>
        );
      })}
    </ol>
  );
}
