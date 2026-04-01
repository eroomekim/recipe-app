import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipeCollection from "../RecipeCollection";
import { makeRecipeCard, mockFetch } from "@/test/fixtures";

// Mock child components that make fetch calls
vi.mock("../SeasonalShelf", () => ({
  default: () => <div data-testid="seasonal-shelf">Seasonal Shelf</div>,
}));

vi.mock("../CollectionBar", () => ({
  default: ({ onFilter }: { onFilter: (ids: string[] | null, label: string | null) => void }) => (
    <div data-testid="collection-bar">
      <button onClick={() => onFilter(null, null)}>All</button>
    </div>
  ),
}));

describe("RecipeCollection", () => {
  let cleanupFetch: () => void;

  beforeEach(() => {
    cleanupFetch = mockFetch({});
  });

  afterEach(() => {
    cleanupFetch();
  });

  const recipes = [
    makeRecipeCard({ id: "1", title: "Pasta Carbonara", tags: [{ name: "Dinner", type: "MEAL_TYPE" }] }),
    makeRecipeCard({ id: "2", title: "Chicken Tikka", tags: [{ name: "Dinner", type: "MEAL_TYPE" }] }),
    makeRecipeCard({ id: "3", title: "Pancakes", tags: [{ name: "Breakfast", type: "MEAL_TYPE" }] }),
  ];

  it("renders recipe count", () => {
    render(<RecipeCollection recipes={recipes} />);
    expect(screen.getByText("3 Recipes")).toBeInTheDocument();
  });

  it("renders all recipe cards", () => {
    render(<RecipeCollection recipes={recipes} />);

    expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    expect(screen.getByText("Chicken Tikka")).toBeInTheDocument();
    expect(screen.getByText("Pancakes")).toBeInTheDocument();
  });

  it("renders seasonal shelf", () => {
    render(<RecipeCollection recipes={recipes} />);
    expect(screen.getByTestId("seasonal-shelf")).toBeInTheDocument();
  });

  it("renders filter bar", () => {
    render(<RecipeCollection recipes={recipes} />);
    expect(screen.getByPlaceholderText(/search recipes/i)).toBeInTheDocument();
  });

  it("filters recipes via search and updates count", async () => {
    render(<RecipeCollection recipes={recipes} />);

    await userEvent.type(screen.getByPlaceholderText(/search recipes/i), "Pasta");

    expect(screen.getByText("1 Recipe")).toBeInTheDocument();
    expect(screen.getByText("Pasta Carbonara")).toBeInTheDocument();
    expect(screen.queryByText("Chicken Tikka")).not.toBeInTheDocument();
  });

  it("shows no-match message when filters exclude everything", async () => {
    render(<RecipeCollection recipes={recipes} />);

    await userEvent.type(screen.getByPlaceholderText(/search recipes/i), "xyznonexistent");

    expect(screen.getByText(/no recipes match/i)).toBeInTheDocument();
  });
});
