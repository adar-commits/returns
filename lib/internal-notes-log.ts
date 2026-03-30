/** Staff-only internal notes stored as JSON array on `return_requests.internal_notes_log`. */

export type InternalNoteLogEntry = {
  text: string;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
};

export function parseInternalNotesLog(raw: unknown): InternalNoteLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: InternalNoteLogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : "";
    if (!text.trim()) continue;
    let created_at: string;
    if (typeof o.created_at === "string") {
      created_at = o.created_at;
    } else if (typeof o.created_at === "number") {
      created_at = new Date(o.created_at).toISOString();
    } else {
      created_at = new Date().toISOString();
    }
    const user_id =
      o.user_id == null || o.user_id === ""
        ? null
        : typeof o.user_id === "string"
          ? o.user_id
          : String(o.user_id);
    const user_name =
      o.user_name == null || o.user_name === ""
        ? null
        : typeof o.user_name === "string"
          ? o.user_name
          : String(o.user_name);
    out.push({ text, created_at, user_id, user_name });
  }
  return out;
}
