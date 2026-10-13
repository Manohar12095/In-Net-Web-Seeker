import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomePage } from "../HomePage";

describe("HomePage Phase 1 Smoke Test", () => {
  it("renders the hero branding, title, and target input", () => {
    render(<HomePage onProjectSelected={() => {}} />);
    
    // Check main headline parts
    expect(screen.getByText(/Collect\. Analyze\./i)).toBeDefined();
    expect(screen.getByText(/Explore\./i)).toBeDefined();
    
    // Check brand tag
    expect(screen.getByText(/Digital Asset Collection & Intelligence Platform/i)).toBeDefined();

    // Check placeholder input
    const input = screen.getByPlaceholderText(/Enter target: domain, URL, or IP/i);
    expect(input).toBeDefined();

    // Check feature cards
    expect(screen.getByText(/Content-Addressed Crawling/i)).toBeDefined();
    expect(screen.getByText(/Passive Infrastructure Intel/i)).toBeDefined();
    expect(screen.getByText(/Sandboxed Threat Neutralization/i)).toBeDefined();
    expect(screen.getByText(/Cryptographic ZIP Manifests/i)).toBeDefined();
  });
});
