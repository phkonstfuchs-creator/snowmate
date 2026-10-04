import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LegalLinks, { PrivacyConsent } from "./LegalLinks";
import LegalPage from "./LegalPage";
import { OPERATOR } from "./operator";

describe("legal links", () => {
  it("links the imprint and the privacy policy", () => {
    render(<LegalLinks />);
    expect(screen.getByRole("link", { name: "Legal notice" })).toHaveAttribute("href", "/impressum");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/datenschutz");
  });

  it("puts the privacy policy link inside the sign-up sentence", () => {
    render(<PrivacyConsent />);
    expect(screen.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/datenschutz");
    expect(screen.getByText(/By creating an account you confirm/)).toHaveTextContent("Under 18?");
  });

  it("frames a legal page with its title and navigation", () => {
    render(<LegalPage title="Impressum"><p>{OPERATOR.name}</p></LegalPage>);
    expect(screen.getByRole("heading", { level: 1, name: "Impressum" })).toBeInTheDocument();
    expect(screen.getByText("Philipp Fuchs")).toBeInTheDocument();
    expect(OPERATOR.email).toMatch(/@/);
  });
});
