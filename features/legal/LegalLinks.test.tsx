import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalLinks, { TermsConsent } from "./LegalLinks";
import LegalPage from "./LegalPage";
import { OPERATOR } from "./operator";

describe("legal links", () => {
  it("links the imprint and the privacy policy", () => {
    render(<LegalLinks />);
    expect(screen.getByRole("link", { name: "Legal notice" })).toHaveAttribute("href", "/impressum");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/datenschutz");
  });

  it("links the terms of use", () => {
    render(<LegalLinks />);
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/nutzungsbedingungen");
  });

  it("asks to accept the terms with both documents linked, and promises nothing it does not do", () => {
    render(<TermsConsent />);
    const box = screen.getByRole("checkbox", { name: /I accept the terms of use/ });
    expect(box).toBeRequired();
    expect(box).toHaveAttribute("name", "acceptTerms");
    expect(screen.getByRole("link", { name: "terms of use" })).toHaveAttribute("href", "/nutzungsbedingungen");
    expect(screen.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/datenschutz");
    expect(screen.queryByText(/parents/)).not.toBeInTheDocument();
  });

  it("frames a legal page with its title and navigation", () => {
    render(<LegalPage title="Impressum"><p>{OPERATOR.name}</p></LegalPage>);
    expect(screen.getByRole("heading", { level: 1, name: "Impressum" })).toBeInTheDocument();
    expect(screen.getByText("Philipp Fuchs")).toBeInTheDocument();
    expect(OPERATOR.email).toMatch(/@/);
  });
});
