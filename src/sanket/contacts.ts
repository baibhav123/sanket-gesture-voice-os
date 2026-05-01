// SanketX 2047 — Local contact book (stored in browser localStorage)
// Lets the user say "WhatsApp Mom hi" instead of dictating phone numbers.

const KEY = "sanketx.contacts.v1";

export type Contact = { name: string; phone: string };

function load(): Contact[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function save(list: Contact[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const contacts = {
  list(): Contact[] { return load(); },
  add(name: string, phone: string) {
    const n = name.trim().toLowerCase();
    const p = phone.replace(/[\s-]/g, "");
    const list = load().filter((c) => c.name.toLowerCase() !== n);
    list.push({ name: name.trim(), phone: p.startsWith("+") ? p : "+" + p });
    save(list);
  },
  remove(name: string) {
    const n = name.trim().toLowerCase();
    save(load().filter((c) => c.name.toLowerCase() !== n));
  },
  /** Find contact by fuzzy name match (case-insensitive substring). */
  find(query: string): Contact | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const list = load();
    return (
      list.find((c) => c.name.toLowerCase() === q) ||
      list.find((c) => c.name.toLowerCase().startsWith(q)) ||
      list.find((c) => c.name.toLowerCase().includes(q)) ||
      null
    );
  },
};
