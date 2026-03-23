import { describe, it, expect } from "vitest";
import { parseVisionResponse, validateImageFiles } from "./image-extractor";

describe("parseVisionResponse", () => {
  it("parses a valid recipe JSON response", () => {
    const raw = JSON.stringify({
      title: "Italian Baked Cannelloni",
      ingredients: ["1/2 cup olive oil", "1 pound ground beef"],
      instructions: ["Preheat oven to 350°F", "Brown the meat"],
      suggestedMealTypes: ["Dinner"],
      suggestedCuisines: ["Italian"],
      suggestedDietary: [],
      suggestedCookTimeMinutes: 65,
      servings: 5,
    });

    const result = parseVisionResponse(raw);
    expect(result.title).toBe("Italian Baked Cannelloni");
    expect(result.ingredients).toHaveLength(2);
    expect(result.instructions).toHaveLength(2);
    expect(result.instructions[0]).toMatchObject({ text: "Preheat oven to 350°F" });
    expect(result.suggestedCookTimeMinutes).toBe(65);
    expect(result.nutrition).toBeNull();
    expect(result.images).toEqual([]);
  });

  it("extracts JSON from markdown code fence", () => {
    const raw = '```json\n{"title":"Test","ingredients":[],"instructions":[]}\n```';
    const result = parseVisionResponse(raw);
    expect(result.title).toBe("Test");
  });

  it("returns defaults for missing optional fields", () => {
    const raw = JSON.stringify({
      title: "Simple Recipe",
      ingredients: ["flour"],
      instructions: ["mix"],
    });
    const result = parseVisionResponse(raw);
    expect(result.suggestedMealTypes).toEqual([]);
    expect(result.suggestedCuisines).toEqual([]);
    expect(result.suggestedDietary).toEqual([]);
    expect(result.suggestedCookTimeMinutes).toBeNull();
    expect(result.servings).toBeNull();
    expect(result.substitutions).toEqual([]);
    expect(result.storageTips).toBe("");
    expect(result.makeAheadNotes).toBe("");
    expect(result.nutrition).toBeNull();
  });

  it("throws when no JSON is found in response", () => {
    expect(() => parseVisionResponse("I cannot extract a recipe from this image."))
      .toThrow("No recipe found");
  });
});

describe("validateImageFiles", () => {
  it("rejects when no files provided", () => {
    expect(() => validateImageFiles([])).toThrow("Please upload at least one image");
  });

  it("rejects when too many files", () => {
    const files = Array.from({ length: 6 }, () => ({
      size: 1000,
      type: "image/jpeg",
      name: "test.jpg",
    })) as File[];
    expect(() => validateImageFiles(files)).toThrow("Maximum 5 files");
  });

  it("rejects files over 20MB", () => {
    const files = [{
      size: 21 * 1024 * 1024,
      type: "image/jpeg",
      name: "huge.jpg",
    }] as File[];
    expect(() => validateImageFiles(files)).toThrow("under 20MB");
  });

  it("rejects unsupported file types", () => {
    const files = [{
      size: 1000,
      type: "image/gif",
      name: "anim.gif",
    }] as File[];
    expect(() => validateImageFiles(files)).toThrow("Supported formats");
  });

  it("accepts valid files", () => {
    const files = [{
      size: 1000,
      type: "image/jpeg",
      name: "photo.jpg",
    }] as File[];
    expect(() => validateImageFiles(files)).not.toThrow();
  });

  it("accepts PDF files", () => {
    const files = [{
      size: 5000,
      type: "application/pdf",
      name: "recipe.pdf",
    }] as File[];
    expect(() => validateImageFiles(files)).not.toThrow();
  });
});
