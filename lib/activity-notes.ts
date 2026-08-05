import { STORAGE_KEYS } from "@/lib/storage/keys";
import { sharedGetItem, sharedSetItem } from "@/lib/storage/shared-client";

/**
 * ملاحظات المتابعة: «قال إيه / عمل إيه» على العميل أو المشروع.
 * مستقلة عن الدفعات والمصروفات — للحوار والوعود والمتابعة.
 */
export type ActivityKind =
  | "said"
  | "did"
  | "call"
  | "visit"
  | "promise"
  | "other";

export type ActivityNote = {
  id: string;
  customerId: string;
  projectId?: string;
  kind: ActivityKind;
  body: string;
  date: string;
  createdAt: string;
};

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  said: "قال",
  did: "عمل",
  call: "مكالمة",
  visit: "زيارة",
  promise: "وعد بدفع",
  other: "متابعة",
};

export const ACTIVITY_KINDS = Object.keys(
  ACTIVITY_KIND_LABELS
) as ActivityKind[];

const ACTIVITY_UPDATED_EVENT = "upvc-activity-updated";

function readNotes(): ActivityNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sharedGetItem(STORAGE_KEYS.activityNotes);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotes(notes: ActivityNote[]) {
  if (typeof window === "undefined") return;
  sharedSetItem(STORAGE_KEYS.activityNotes, JSON.stringify(notes));
  window.dispatchEvent(new Event(ACTIVITY_UPDATED_EVENT));
}

export function loadActivityNotes(): ActivityNote[] {
  return readNotes();
}

export function saveActivityNotes(notes: ActivityNote[]) {
  writeNotes(notes);
}

export function upsertActivityNote(note: ActivityNote) {
  const all = [note, ...loadActivityNotes().filter((n) => n.id !== note.id)];
  saveActivityNotes(all);
}

export function deleteActivityNote(noteId: string) {
  saveActivityNotes(loadActivityNotes().filter((n) => n.id !== noteId));
}

export function listActivityNotesForCustomer(
  customerId: string,
  notes: ActivityNote[] = loadActivityNotes()
): ActivityNote[] {
  return notes
    .filter((n) => n.customerId === customerId)
    .sort((a, b) => {
      const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (byDate !== 0) return byDate;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function listActivityNotesForProject(
  projectId: string,
  notes: ActivityNote[] = loadActivityNotes()
): ActivityNote[] {
  return notes
    .filter((n) => n.projectId === projectId)
    .sort((a, b) => {
      const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (byDate !== 0) return byDate;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

/** أحدث الملاحظات عبر كل العملاء — للمتابعة من الحسابات */
export function listRecentActivityNotes(
  limit = 40,
  notes: ActivityNote[] = loadActivityNotes()
): ActivityNote[] {
  return [...notes]
    .sort((a, b) => {
      const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (byDate !== 0) return byDate;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);
}

export function createActivityNoteId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export { ACTIVITY_UPDATED_EVENT };
