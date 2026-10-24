import assert from "node:assert/strict";
import test from "node:test";
import { isWinAnsi, toWinAnsi } from "../client/src/lib/textSafety";

test("keeps accented names the built-in PDF font can print", () => {
  const name = "José Muñoz, Zoë Åström, naïve façade, Müller";
  assert.deepEqual(toWinAnsi(name), { text: name, substituted: [] });
});

test("keeps Windows-1252 typography (curly quotes, dashes, euro)", () => {
  const s = "“Trust” – draft, €100 • item…";
  assert.deepEqual(toWinAnsi(s), { text: s, substituted: [] });
});

test("folds letters with a clear base form and reports them", () => {
  const r = toWinAnsi("Łukasz Čapek Dvořák");
  assert.equal(r.text, "Lukasz Capek Dvorák");
  assert.deepEqual(r.substituted.sort(), ["Č", "Ł", "ř"].sort());
});

test("replaces characters with no printable equivalent and reports them", () => {
  const r = toWinAnsi("漢字");
  assert.equal(r.text, "??");
  assert.deepEqual(r.substituted, ["漢", "字"]);
});

test("drops control characters silently", () => {
  assert.equal(toWinAnsi("a\u0007b").text, "ab");
});

test("isWinAnsi matches the encodable ranges", () => {
  assert.equal(isWinAnsi("é"), true);
  assert.equal(isWinAnsi("Ł"), false);
  assert.equal(isWinAnsi("\u0081"), false);
});
