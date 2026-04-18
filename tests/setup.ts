import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock WXT globals not available outside the extension runtime
(globalThis as any).browser = {
  runtime: { sendMessage: vi.fn(), onMessage: { addListener: vi.fn() } },
  storage: { local: { get: vi.fn(), set: vi.fn() } },
  tabs: { query: vi.fn(), sendMessage: vi.fn() },
};

(globalThis as any).defineContentScript = (def: any) => def;
(globalThis as any).defineUnlistedScript = (fn: any) => fn;
(globalThis as any).defineBackground = (fn: any) => fn;
