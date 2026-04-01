import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupForm from "../SignupForm";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client");
const mockRouter = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", async () => ({
  ...(await vi.importActual("next/navigation")),
  useRouter: () => mockRouter,
}));

describe("SignupForm", () => {
  let mockSignUp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp = vi.fn();
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        signUp: mockSignUp,
        signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      },
    });
  });

  it("renders the create account form", () => {
    render(<SignupForm />);

    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("At least 6 characters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account$/i })).toBeInTheDocument();
  });

  it("renders link to sign in page", () => {
    render(<SignupForm />);

    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("submits signup and redirects on success", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    render(<SignupForm />);

    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "new@example.com");
    await userEvent.type(screen.getByPlaceholderText("At least 6 characters"), "password123");
    fireEvent.submit(screen.getByRole("button", { name: /create account$/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/recipes");
    });
  });

  it("shows error on failed signup", async () => {
    mockSignUp.mockResolvedValue({
      error: { message: "User already registered" },
    });
    render(<SignupForm />);

    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "existing@example.com");
    await userEvent.type(screen.getByPlaceholderText("At least 6 characters"), "password123");
    fireEvent.submit(screen.getByRole("button", { name: /create account$/i }));

    await waitFor(() => {
      expect(screen.getByText("User already registered")).toBeInTheDocument();
    });
  });

  it("requires minimum 6 character password", () => {
    render(<SignupForm />);

    const passwordInput = screen.getByPlaceholderText("At least 6 characters");
    expect(passwordInput).toHaveAttribute("minLength", "6");
  });
});
