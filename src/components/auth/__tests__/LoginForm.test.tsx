import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../LoginForm";
import { createClient } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client");
const mockRouter = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", async () => ({
  ...(await vi.importActual("next/navigation")),
  useRouter: () => mockRouter,
}));

describe("LoginForm", () => {
  let mockSignIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn = vi.fn();
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn,
        signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      },
    });
  });

  it("renders the sign in form with email, password, and submit button", () => {
    render(<LoginForm />);

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in$/i })).toBeInTheDocument();
  });

  it("renders Google OAuth button", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: /sign in with google/i })).toBeInTheDocument();
  });

  it("renders link to register page", () => {
    render(<LoginForm />);

    const link = screen.getByRole("link", { name: /register/i });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("submits email and password and redirects on success", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Your password"), "password123");
    fireEvent.submit(screen.getByRole("button", { name: /sign in$/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/recipes");
    });
  });

  it("shows error message on failed login", async () => {
    mockSignIn.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Your password"), "wrongpass");
    fireEvent.submit(screen.getByRole("button", { name: /sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials")).toBeInTheDocument();
    });
  });

  it("disables submit button while loading", async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await userEvent.type(screen.getByPlaceholderText("Your password"), "password123");
    fireEvent.submit(screen.getByRole("button", { name: /sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText("Signing in…")).toBeInTheDocument();
    });
  });
});
