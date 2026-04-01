import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PantrySearch from "../PantrySearch";
import { makeRecipeCard, mockFetch } from "@/test/fixtures";

describe("PantrySearch", () => {
  let cleanupFetch: () => void;

  afterEach(() => {
    cleanupFetch?.();
  });

  const knownIngredients = ["chicken", "garlic", "onion", "rice", "soy sauce", "ginger"];

  it("renders ingredient input and search button", () => {
    cleanupFetch = mockFetch({});
    render(<PantrySearch knownIngredients={knownIngredients} />);

    expect(screen.getByPlaceholderText(/type an ingredient/i)).toBeInTheDocument();
    expect(screen.getByText(/find recipes/i)).toBeInTheDocument();
  });

  it("shows autocomplete suggestions while typing", async () => {
    cleanupFetch = mockFetch({});
    render(<PantrySearch knownIngredients={knownIngredients} />);

    await userEvent.type(screen.getByPlaceholderText(/type an ingredient/i), "chi");

    expect(screen.getByText("chicken")).toBeInTheDocument();
  });

  it("adds ingredient as tag on Enter", async () => {
    cleanupFetch = mockFetch({});
    render(<PantrySearch knownIngredients={knownIngredients} />);

    await userEvent.type(screen.getByPlaceholderText(/type an ingredient/i), "chi");
    await userEvent.keyboard("{Enter}");

    // "chicken" should appear as a selected tag
    expect(screen.getByText("chicken")).toBeInTheDocument();
  });

  it("removes ingredient tag on click", async () => {
    cleanupFetch = mockFetch({});
    render(<PantrySearch knownIngredients={knownIngredients} />);

    // Add an ingredient
    await userEvent.type(screen.getByPlaceholderText(/type an ingredient/i), "chicken");
    await userEvent.keyboard("{Enter}");

    // Remove it
    const removeBtn = screen.getByLabelText(/remove chicken/i);
    await userEvent.click(removeBtn);

    // Should show empty input placeholder again
    expect(screen.getByPlaceholderText(/type an ingredient/i)).toBeInTheDocument();
  });

  it("shows results after searching", async () => {
    const results = [
      {
        recipe: makeRecipeCard({ id: "1", title: "Chicken Stir Fry" }),
        matchedCount: 3,
        totalCount: 5,
        coveragePercent: 60,
        missingIngredients: ["sesame oil", "cornstarch"],
      },
    ];
    cleanupFetch = mockFetch({
      "/api/recipes/match-ingredients": results,
    });

    render(<PantrySearch knownIngredients={knownIngredients} />);

    await userEvent.type(screen.getByPlaceholderText(/type an ingredient/i), "chicken");
    await userEvent.keyboard("{Enter}");
    await userEvent.click(screen.getByText(/find recipes/i));

    await waitFor(() => {
      expect(screen.getByText("Chicken Stir Fry")).toBeInTheDocument();
      expect(screen.getByText("3/5 ingredients")).toBeInTheDocument();
      expect(screen.getByText("60% match")).toBeInTheDocument();
    });
  });

  it("shows empty state when no matches", async () => {
    cleanupFetch = mockFetch({
      "/api/recipes/match-ingredients": [],
    });

    render(<PantrySearch knownIngredients={knownIngredients} />);

    await userEvent.type(screen.getByPlaceholderText(/type an ingredient/i), "truffle");
    await userEvent.keyboard("{Enter}");
    await userEvent.click(screen.getByText(/find recipes/i));

    await waitFor(() => {
      expect(screen.getByText(/no recipes match/i)).toBeInTheDocument();
    });
  });

  it("disables search button when no ingredients selected", () => {
    cleanupFetch = mockFetch({});
    render(<PantrySearch knownIngredients={knownIngredients} />);

    const button = screen.getByText(/find recipes/i).closest("button");
    expect(button).toBeDisabled();
  });

  it("has adjustable coverage threshold slider", () => {
    cleanupFetch = mockFetch({});
    render(<PantrySearch knownIngredients={knownIngredients} />);

    expect(screen.getByText(/min. coverage: 60%/i)).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });
});
