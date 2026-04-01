import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RecipePage from "../RecipePage";
import { makeRecipeDetail, mockFetch } from "@/test/fixtures";

// Mock useSettings
vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: {
      measurementSystem: "imperial",
      maxDisplayImages: 8,
      defaultServings: null,
      cookingAutoReadAloud: false,
      cookingKeepAwake: true,
      altitude: null,
      equipment: [],
    },
    loading: false,
    update: vi.fn(),
  }),
}));

describe("RecipePage", () => {
  let cleanupFetch: () => void;

  beforeEach(() => {
    cleanupFetch = mockFetch({
      "GET /api/recipes": [],
    });
  });

  afterEach(() => {
    cleanupFetch();
  });

  it("renders recipe title", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);
    expect(screen.getByText("Braised Short Ribs")).toBeInTheDocument();
  });

  it("renders meal type and cuisine rubric", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);
    expect(screen.getByText("Dinner · Italian")).toBeInTheDocument();
  });

  it("renders all ingredients", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);

    expect(screen.getByText("Ingredients")).toBeInTheDocument();
    expect(screen.getByText(/3 lbs short ribs/)).toBeInTheDocument();
    expect(screen.getByText(/2 onions/)).toBeInTheDocument();
    expect(screen.getByText(/4 cloves garlic/)).toBeInTheDocument();
    expect(screen.getByText(/2 cups red wine/)).toBeInTheDocument();
  });

  it("renders all instructions with step numbers", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);

    expect(screen.getByText("Instructions")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText(/Season the ribs/)).toBeInTheDocument();
    expect(screen.getByText(/Sear in a hot Dutch oven/)).toBeInTheDocument();
  });

  it("renders cook time", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);
    expect(screen.getByText("180 mins")).toBeInTheDocument();
  });

  it("renders serving count", () => {
    render(<RecipePage recipe={makeRecipeDetail({ servings: 4 })} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders source URL link", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);
    const link = screen.getByText(/view original/i);
    expect(link).toHaveAttribute("href", "https://example.com/braised-short-ribs");
  });

  it("renders nutrition card when nutrition data exists", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);
    expect(screen.getByText("Nutrition")).toBeInTheDocument();
  });

  it("renders hero image", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);
    const img = screen.getByAltText("Braised Short Ribs");
    expect(img).toHaveAttribute("src", "https://example.com/ribs.jpg");
  });

  it("renders Cook button", () => {
    render(<RecipePage recipe={makeRecipeDetail()} />);
    expect(screen.getByText("Cook")).toBeInTheDocument();
  });

  it("renders page indicator when pageIndex and totalPages provided", () => {
    render(<RecipePage recipe={makeRecipeDetail()} pageIndex={2} totalPages={10} />);
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("renders storage tips when present", () => {
    render(<RecipePage recipe={makeRecipeDetail({ storageTips: "Keep in fridge for 3 days." })} />);
    expect(screen.getByText("Storage")).toBeInTheDocument();
  });

  it("does not render source link when sourceUrl is null", () => {
    render(<RecipePage recipe={makeRecipeDetail({ sourceUrl: null })} />);
    expect(screen.queryByText(/view original/i)).not.toBeInTheDocument();
  });
});
