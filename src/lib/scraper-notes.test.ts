import { describe, it, expect } from "vitest";
import * as cheerio from "cheerio";
import { extractRecipeNotes } from "./scraper-notes";

describe("extractRecipeNotes", () => {
  it("extracts from WPRM recipe notes section", () => {
    const html = `
      <div class="wprm-recipe-notes">
        <h3>Notes</h3>
        <p><strong>Storage:</strong> Keep refrigerated up to 3 days.</p>
        <p><strong>Substitution:</strong> Use almond milk instead of dairy milk.</p>
        <p><strong>Make ahead:</strong> Can be prepared the night before.</p>
      </div>
    `;
    const $ = cheerio.load(html);
    const notes = extractRecipeNotes($);
    expect(notes.storageTips).toContain("refrigerated");
    expect(notes.makeAheadNotes).toContain("night before");
  });

  it("extracts from headings containing keywords", () => {
    const html = `
      <h2>Substitutions</h2>
      <p>You can swap butter for coconut oil.</p>
      <h2>How to Store</h2>
      <p>Keeps in the fridge for up to 5 days.</p>
    `;
    const $ = cheerio.load(html);
    const notes = extractRecipeNotes($);
    expect(notes.storageTips).toContain("5 days");
  });

  it("returns empty strings when no notes found", () => {
    const $ = cheerio.load("<div><p>Just a regular page</p></div>");
    const notes = extractRecipeNotes($);
    expect(notes.storageTips).toBe("");
    expect(notes.makeAheadNotes).toBe("");
    expect(notes.servingSuggestions).toBe("");
    expect(notes.techniqueNotes).toBe("");
  });

  it("extracts serving suggestions", () => {
    const html = `
      <h3>Serving Suggestions</h3>
      <p>Serve over rice with a squeeze of lime.</p>
    `;
    const $ = cheerio.load(html);
    const notes = extractRecipeNotes($);
    expect(notes.servingSuggestions).toContain("rice");
  });
});
