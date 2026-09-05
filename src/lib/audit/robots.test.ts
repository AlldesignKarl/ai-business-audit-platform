import { describe, it, expect } from "vitest";
import { evaluateRobotsTxt } from "@/lib/audit/robots";

describe("evaluateRobotsTxt", () => {
  it("permite todo si no hay reglas para *", () => {
    expect(evaluateRobotsTxt("User-agent: Googlebot\nDisallow: /private", "/")).toBe(true);
  });

  it("bloquea rutas listadas explícitamente para *", () => {
    const robots = "User-agent: *\nDisallow: /admin\nDisallow: /private";
    expect(evaluateRobotsTxt(robots, "/admin")).toBe(false);
    expect(evaluateRobotsTxt(robots, "/private/data")).toBe(false);
    expect(evaluateRobotsTxt(robots, "/")).toBe(true);
  });

  it("permite todo con robots.txt vacío", () => {
    expect(evaluateRobotsTxt("", "/cualquier-ruta")).toBe(true);
  });
});
