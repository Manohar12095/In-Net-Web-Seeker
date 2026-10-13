import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DOMPurify from "dompurify";
import { AppShell } from "@/components/AppShell";

describe("Frontend Component & Security Test Suite", () => {
  it("renders the brand logo and application identity in AppShell", () => {
    const handleHome = vi.fn();
    render(
      <AppShell onNavigateHome={handleHome}>
        <div data-testid="test-child">Child Content</div>
      </AppShell>
    );

    // Verify brand logo image is rendered
    const logoImg = screen.getByAltText("IN NET Creations Logo");
    expect(logoImg).toBeDefined();
    expect(logoImg.tagName).toBe("IMG");

    // Verify brand title and attribution
    expect(screen.getByText("In Net Web Seeker")).toBeDefined();
    expect(screen.getAllByText(/IN NET Creations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/S\. Manohar/i).length).toBeGreaterThan(0);

    // Verify home button click triggers navigation
    const homeBtn = screen.getByTitle("Return to IN Net Web Seeker Home");
    fireEvent.click(homeBtn);
    expect(handleHome).toHaveBeenCalledTimes(1);
  });

  it("sanitizes hostile script payloads to prevent XSS in asset previews", () => {
    const hostileSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS_SVG')">
        <script>alert('XSS_SCRIPT')</script>
        <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
      </svg>
    `;

    const sanitized = DOMPurify.sanitize(hostileSVG);

    // Assert scripts and dangerous event handlers are disarmed
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("alert('XSS_SCRIPT')");
    expect(sanitized).not.toContain("onload=");

    // Assert benign SVG elements remain intact
    expect(sanitized).toContain("<svg");
    expect(sanitized).toContain("<circle");
  });

  it("sanitizes hostile HTML iframe and javascript protocol vectors", () => {
    const hostileHTML = `
      <div onclick="evil()">
        <a href="javascript:void(document.cookie)">Click me</a>
        <iframe src="http://attacker.com/steal"></iframe>
        <p>Safe content</p>
      </div>
    `;

    const sanitized = DOMPurify.sanitize(hostileHTML);
    expect(sanitized).not.toContain("onclick=");
    expect(sanitized).not.toContain("javascript:void");
    expect(sanitized).toContain("<p>Safe content</p>");
  });
});
