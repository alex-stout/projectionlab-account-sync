import { describe, it, expect } from "vitest";
import { PLUGINS, accountsKey, mappingsKey, lastSyncedKey, lastRefreshedKey } from "./index";

describe("PLUGINS", () => {
  it("contains vanguard and alight", () => {
    const ids = PLUGINS.map((p) => p.id);
    expect(ids).toContain("vanguard");
    expect(ids).toContain("alight");
  });

  it("every plugin has required fields", () => {
    for (const plugin of PLUGINS) {
      expect(plugin.id).toBeTruthy();
      expect(plugin.name).toBeTruthy();
      expect(plugin.icon).toBeTruthy();
      expect(plugin.urlPatterns.length).toBeGreaterThan(0);
    }
  });
});

describe("storage key helpers", () => {
  it("accountsKey", () => {
    expect(accountsKey("vanguard")).toBe("accounts_vanguard");
  });

  it("mappingsKey", () => {
    expect(mappingsKey("alight")).toBe("mappings_alight");
  });

  it("lastSyncedKey", () => {
    expect(lastSyncedKey("vanguard")).toBe("lastSynced_vanguard");
  });

  it("lastRefreshedKey", () => {
    expect(lastRefreshedKey("alight")).toBe("lastRefreshed_alight");
  });
});
