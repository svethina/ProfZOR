/**
 * Ссылка на установщик только для Windows, не для macOS/телефона.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Platform = require("../platform.js");

describe("Платформа / установщик Windows", () => {
  it("видит Windows по userAgentData и по platform", () => {
    expect(
      Platform.isWindowsClient({ userAgentData: { platform: "Windows" } })
    ).toBe(true);
    expect(
      Platform.isWindowsClient({
        platform: "Win32",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      })
    ).toBe(true);
  });

  it("не считает Windows macOS, Linux и телефоны", () => {
    expect(
      Platform.isWindowsClient({
        userAgentData: { platform: "macOS" },
      })
    ).toBe(false);
    expect(
      Platform.isWindowsClient({
        platform: "MacIntel",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      })
    ).toBe(false);
    expect(
      Platform.isWindowsClient({
        platform: "Linux x86_64",
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      })
    ).toBe(false);
    expect(
      Platform.isWindowsClient({
        platform: "Linux armv8l",
        userAgent: "Mozilla/5.0 (Linux; Android 14)",
      })
    ).toBe(false);
    expect(
      Platform.isWindowsClient({
        platform: "iPhone",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      })
    ).toBe(false);
  });

  it("ведёт на zip релизов, не на редкий .exe", () => {
    expect(Platform.SETUP_ZIP).toMatch(/v1\.0-trial\/ProfZOR-Setup\.zip$/);
  });
});
