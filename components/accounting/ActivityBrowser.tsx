"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY_KIND_LABELS,
  ACTIVITY_UPDATED_EVENT,
  listRecentActivityNotes,
  type ActivityNote,
} from "@/lib/activity-notes";
import { getCustomerById } from "@/lib/customers";
import { getProjectById } from "@/lib/projects";
import { ROUTES } from "@/lib/routes";
import { formatDate, smartSearchMatch } from "@/lib/utils";
import { ActivityNotesPanel } from "@/components/accounting/ActivityNotesPanel";
import { mergeCustomers } from "@/lib/customers";
import { listAllProjects } from "@/lib/projects";

function readNotes(): ActivityNote[] {
  if (typeof window === "undefined") return [];
  return listRecentActivityNotes(80);
}

/**
 * صفحة المتابعات من الحسابات: كل الحوارات + إضافة سريعة على شغل.
 */
export function ActivityBrowser() {
  const [notes, setNotes] = useState(readNotes);
  const [query, setQuery] = useState("");
  const [optionsTick, setOptionsTick] = useState(0);
  const [composeFor, setComposeFor] = useState<{
    customerId: string;
    projectId?: string;
  } | null>(null);

  useEffect(() => {
    function refresh() {
      setNotes(listRecentActivityNotes(80));
      setOptionsTick((n) => n + 1);
    }
    window.addEventListener(ACTIVITY_UPDATED_EVENT, refresh);
    window.addEventListener("upvc-projects-updated", refresh);
    window.addEventListener("upvc-customers-updated", refresh);
    return () => {
      window.removeEventListener(ACTIVITY_UPDATED_EVENT, refresh);
      window.removeEventListener("upvc-projects-updated", refresh);
      window.removeEventListener("upvc-customers-updated", refresh);
    };
  }, []);

  const projectOptions = useMemo(() => {
    void optionsTick;
    if (typeof window === "undefined") return [];
    const customers = new Map(mergeCustomers().map((c) => [c.id, c]));
    return listAllProjects()
      .filter((p) => p.workflow !== "quote")
      .map((p) => ({
        projectId: p.id,
        customerId: p.customerId,
        label: `${customers.get(p.customerId)?.name ?? "عميل"} — ${p.name}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ar"));
  }, [optionsTick]);

  const filtered = useMemo(() => {
    return notes.filter((note) => {
      const customer = getCustomerById(note.customerId);
      const project = note.projectId
        ? getProjectById(note.projectId)
        : undefined;
      return smartSearchMatch(query, [
        customer?.name,
        customer?.phone,
        project?.name,
        note.body,
        ACTIVITY_KIND_LABELS[note.kind],
      ]);
    });
  }, [notes, query]);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <p className="text-xs text-muted">
          سجّل هنا إيه اللي العميل قاله أو اتعمل — عشان تتابع الفلوس والحوار.
        </p>
        <label className="mt-3 block text-[11px] font-semibold text-muted">
          إضافة متابعة على شغل
        </label>
        <select
          className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          value={
            composeFor
              ? `${composeFor.customerId}|${composeFor.projectId ?? ""}`
              : ""
          }
          onChange={(e) => {
            const raw = e.target.value;
            if (!raw) {
              setComposeFor(null);
              return;
            }
            const [customerId, projectId] = raw.split("|");
            setComposeFor({
              customerId,
              projectId: projectId || undefined,
            });
          }}
        >
          <option value="">اختَر شغلانة…</option>
          {projectOptions.map((opt) => (
            <option
              key={opt.projectId}
              value={`${opt.customerId}|${opt.projectId}`}
            >
              {opt.label}
            </option>
          ))}
        </select>
      </section>

      {composeFor ? (
        <ActivityNotesPanel
          customerId={composeFor.customerId}
          projectId={composeFor.projectId}
          title="تسجيل متابعة"
          limit={4}
        />
      ) : null}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="بحث في المتابعات…"
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted">
          مفيش متابعات مسجّلة بعد
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((note) => {
            const customer = getCustomerById(note.customerId);
            const project = note.projectId
              ? getProjectById(note.projectId)
              : undefined;
            const href =
              note.projectId
                ? ROUTES.design.account(note.customerId, note.projectId)
                : ROUTES.design.projects(note.customerId);

            return (
              <li key={note.id}>
                <Link
                  href={href}
                  className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card px-3.5 py-3 transition-all active:scale-[0.99]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#1F6B55]/12 px-2 py-0.5 text-[10px] font-bold text-[#1F6B55]">
                      {ACTIVITY_KIND_LABELS[note.kind]}
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatDate(note.date)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {customer?.name ?? "عميل"}
                    {project ? ` · ${project.name}` : ""}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-muted">
                    {note.body}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
