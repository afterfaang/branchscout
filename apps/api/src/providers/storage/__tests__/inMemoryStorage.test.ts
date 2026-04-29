import { describe, it, expect } from "vitest";
import { InMemoryStorageProvider } from "../InMemoryStorageProvider.js";
import { buildStorageProvider } from "../index.js";

describe("InMemoryStorageProvider", () => {
  it("put + exists + publicUrl round-trip", async () => {
    const s = new InMemoryStorageProvider();
    expect(await s.exists("foo")).toBe(false);
    const obj = await s.put({
      key: "foo",
      body: Buffer.from("hello world"),
      contentType: "text/plain",
    });
    expect(obj.sizeBytes).toBe(11);
    expect(obj.contentType).toBe("text/plain");
    expect(await s.exists("foo")).toBe(true);
    expect(s.publicUrl("foo")).toMatch(/^data:text\/plain;base64,/);
  });

  it("does not re-upload when key already exists (caller-side check)", async () => {
    const s = new InMemoryStorageProvider();
    await s.put({ key: "k", body: Buffer.from("a"), contentType: "image/jpeg" });
    expect(s.size()).toBe(1);
    if (!(await s.exists("k"))) {
      await s.put({ key: "k", body: Buffer.from("b"), contentType: "image/jpeg" });
    }
    expect(s.size()).toBe(1);
  });
});

describe("buildStorageProvider", () => {
  it("falls back to InMemory when no R2 env", async () => {
    const provider = await buildStorageProvider({ env: {}, logger: () => {} });
    expect(provider.name).toBe("inmemory");
  });
});
