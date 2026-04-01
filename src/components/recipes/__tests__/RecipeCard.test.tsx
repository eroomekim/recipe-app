import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RecipeCard from "../RecipeCard";
import { makeRecipeCard } from "@/test/fixtures";
import { mockFetch } from "@/test/fixtures";

describe("RecipeCard", () => {
  it("renders recipe title and metadata", () => {
    const cleanup = mockFetch({});
    const recipe = makeRecipeCard();
    render(<RecipeCard recipe={recipe} />);

    expect(screen.getByText("Braised Short Ribs")).toBeInTheDocument();
    expect(screen.getByText(/12 ingredients/)).toBeInTheDocument();
    expect(screen.getByText(/8 steps/)).toBeInTheDocument();
    expect(screen.getByText(/180 min/)).toBeInTheDocument();
    cleanup();
  });

  it("renders meal type rubric label", () => {
    const cleanup = mockFetch({});
    const recipe = makeRecipeCard();
    render(<RecipeCard recipe={recipe} />);

    expect(screen.getByText("Dinner")).toBeInTheDocument();
    cleanup();
  });

  it("renders hero image", () => {
    const cleanup = mockFetch({});
    const recipe = makeRecipeCard();
    render(<RecipeCard recipe={recipe} />);

    const img = screen.getByAltText("Braised Short Ribs");
    expect(img).toHaveAttribute("src", "https://example.com/ribs.jpg");
    cleanup();
  });

  it("shows 'No image' placeholder when no images", () => {
    const cleanup = mockFetch({});
    const recipe = makeRecipeCard({ images: [] });
    render(<RecipeCard recipe={recipe} />);

    expect(screen.getByText("No image")).toBeInTheDocument();
    cleanup();
  });

  it("links to recipe detail page", () => {
    const cleanup = mockFetch({});
    const recipe = makeRecipeCard({ id: "abc123" });
    render(<RecipeCard recipe={recipe} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/recipes/abc123");
    cleanup();
  });

  it("does not show cook time when null", () => {
    const cleanup = mockFetch({});
    const recipe = makeRecipeCard({ cookTime: null });
    render(<RecipeCard recipe={recipe} />);

    expect(screen.queryByText(/min/)).not.toBeInTheDocument();
    cleanup();
  });
});
