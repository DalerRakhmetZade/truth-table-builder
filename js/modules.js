// Course modules — the top level above topics. Both Study Notes and Flashcards
// group their topics by module so the material stays navigable as it grows.
//
// To add a module: append an entry here, then tag the relevant groups in
// notes-data.js and flashcards-data.js with `module: "<id>"`.
export const MODULES = [
  {
    id: "toolkit",
    title: "Proof Toolkit",
    blurb: "Theorems & lemmas you invoke in proofs — a prerequisite reference.",
  },
  {
    id: "m1",
    title: "Module 1",
    blurb: "Logic, equivalences, inference, proofs, predicates & normal forms.",
  },
  {
    id: "m2",
    title: "Module 2",
    blurb: "Coming soon.",
  },
];

export function moduleById(id) {
  return MODULES.find((m) => m.id === id) || null;
}

// Every module paired with its groups, in module order (includes empty modules).
export function modulesWithGroups(groups) {
  return MODULES.map((m) => ({
    module: m,
    groups: groups.filter((g) => g.module === m.id),
  }));
}

// Bucket an ordered list of groups (each with a `module` id) by module, preserving
// both module order and group order. Groups whose module is missing/unknown fall
// into the first module so nothing ever disappears from the UI. Empty modules are
// omitted (use modulesWithGroups when you want every module, including empty ones).
export function groupsByModule(groups) {
  const fallback = MODULES[0] ? MODULES[0].id : null;
  const byId = new Map(MODULES.map((m) => [m.id, []]));
  for (const g of groups) {
    const mid = byId.has(g.module) ? g.module : fallback;
    if (mid == null) continue;
    byId.get(mid).push(g);
  }
  return MODULES
    .map((m) => ({ module: m, groups: byId.get(m.id) || [] }))
    .filter((entry) => entry.groups.length > 0);
}
