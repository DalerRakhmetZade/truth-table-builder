import test from "node:test";
import assert from "node:assert/strict";
import { NOTES } from "../js/notes-data.js";

test("NOTES is a non-empty array of well-formed sections", () => {
  assert.ok(Array.isArray(NOTES) && NOTES.length > 0);
  for (const sec of NOTES) {
    assert.equal(typeof sec.id, "string");
    assert.match(sec.id, /^[a-z0-9-]+$/, "id is a kebab anchor: " + sec.id);
    assert.equal(typeof sec.title, "string");
    assert.ok(Array.isArray(sec.cards) && sec.cards.length > 0, "section has cards: " + sec.id);
  }
});

test("section ids are unique", () => {
  const ids = NOTES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every card has the required fields for its kind", () => {
  for (const sec of NOTES) {
    for (const card of sec.cards) {
      const kind = card.kind || "equiv";
      if (kind === "equiv") {
        if (card.rows) {
          assert.ok(Array.isArray(card.rows) && card.rows.length > 0, sec.id + ": equiv rows");
          for (const r of card.rows) {
            assert.equal(typeof r.lhs, "string");
            assert.equal(typeof r.rhs, "string");
          }
        } else {
          assert.equal(typeof card.lhs, "string", sec.id + ": equiv needs lhs");
          assert.equal(typeof card.rhs, "string", sec.id + ": equiv needs rhs");
        }
      } else if (kind === "step") {
        assert.equal(typeof card.title, "string", sec.id + ": step needs title");
        if (card.examples) {
          assert.ok(Array.isArray(card.examples));
          for (const e of card.examples) {
            assert.equal(typeof e.from, "string");
            assert.equal(typeof e.to, "string");
          }
        }
      } else if (kind === "text") {
        assert.equal(typeof card.body, "string", sec.id + ": text needs body");
      } else {
        assert.fail("unknown card kind: " + kind);
      }
    }
  }
});
