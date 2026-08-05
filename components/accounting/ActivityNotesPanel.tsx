"use client";

import { useEffect, useState } from "react";
import { todayIsoDate } from "@/lib/accounting";
import {
  ACTIVITY_KIND_LABELS,
  ACTIVITY_KINDS,
  ACTIVITY_UPDATED_EVENT,
  createActivityNoteId,
  deleteActivityNote,
  listActivityNotesForCustomer,
  listActivityNotesForProject,
  upsertActivityNote,
  type ActivityKind,
  type ActivityNote,
} from "@/lib/activity-notes";
import { formatDate } from "@/lib/utils";

type Props = {
  customerId: string;
  projectId?: string;
  /** عنوان القسم */
  title?: string;
  /** حد العرض قبل «عرض الكل» */
  limit?: number;
};

/**
 * تسجيل ومتابعة «قال إيه / عمل إيه» على عميل أو مشروع.
 */
export function ActivityNotesPanel({
  customerId,
  projectId,
  title = "المتابعة",
  limit = 8,
}: Props) {
  const [notes, setNotes] = useState<ActivityNote[]>([]);
  const [kind, setKind] = useState<ActivityKind>("said");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(todayIsoDate);
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function refresh() {
      setNotes(
        projectId
          ? listActivityNotesForProject(projectId)
          : listActivityNotesForCustomer(customerId)
      );
    }
    refresh();
    window.addEventListener(ACTIVITY_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(ACTIVITY_UPDATED_EVENT, refresh);
  }, [customerId, projectId]);

  function handleSave() {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      upsertActivityNote({
        id: createActivityNoteId(),
        customerId,
        projectId,
        kind,
        body: text,
        date: date || todayIsoDate(),
        createdAt: new Date().toISOString(),
      });
      setBody("");
      setKind("said");
      setDate(todayIsoDate());
    } finally {
      setSaving(false);
    }
  }

  const visible = showAll ? notes : notes.slice(0, limit);

  return (
    <section className="rounded-2xl border border-border bg-card p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
        <h3 className="text-sm font-bold text-foreground">
          {title}
          <span className="ms-1.5 text-xs font-semibold text-muted tabular-nums">
            {notes.length}
          </span>
        </h3>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-background/60 p-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {ACTIVITY_KINDS.map((id) => {
            const active = kind === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKind(id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                  active
                    ? "bg-[#1F6B55] text-white"
                    : "border border-border bg-card text-muted"
                }`}
              >
                {ACTIVITY_KIND_LABELS[id]}
              </button>
            );
          })}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="إيه اللي اتقالي أو اتعمل…"
          className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!body.trim() || saving}
            className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#1F6B55] px-4 text-sm font-bold text-white disabled:opacity-40 active:scale-[0.98]"
          >
            تسجيل
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
          لسه مفيش متابعة — سجّل قال إيه أو عمل إيه
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {visible.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-3 rounded-xl bg-background/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-[#1F6B55]/12 px-2 py-0.5 text-[10px] font-bold text-[#1F6B55]">
                    {ACTIVITY_KIND_LABELS[note.kind]}
                  </span>
                  <span className="text-[11px] text-muted">
                    {formatDate(note.date)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {note.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm("حذف المتابعة دي؟")) {
                    deleteActivityNote(note.id);
                  }
                }}
                className="shrink-0 text-[11px] font-semibold text-[#E85A8A]"
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      )}

      {notes.length > limit && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 w-full py-2 text-center text-xs font-bold text-primary"
        >
          عرض الكل ({notes.length})
        </button>
      ) : null}
    </section>
  );
}
