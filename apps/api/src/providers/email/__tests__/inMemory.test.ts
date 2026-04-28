import { describe, it, expect } from "vitest";
import { InMemoryEmailProvider } from "../InMemoryEmailProvider.js";
import { buildEmailProvider } from "../index.js";

describe("InMemoryEmailProvider", () => {
  it("stores sent messages and returns them via list()", async () => {
    const provider = new InMemoryEmailProvider({ logger: () => {} });
    await provider.send({ to: "a@x.test", subject: "Hello", text: "first" });
    await provider.send({ to: "b@x.test", subject: "Hi", text: "second" });

    const list = provider.list();
    expect(list).toHaveLength(2);
    expect(list[0]?.to).toBe("b@x.test"); // most recent first
    expect(list[1]?.to).toBe("a@x.test");
  });

  it("trims to maxSize when exceeded", async () => {
    const provider = new InMemoryEmailProvider({ logger: () => {}, maxSize: 2 });
    for (let i = 0; i < 5; i++) {
      await provider.send({ to: `n${i}@x.test`, subject: String(i), text: "x" });
    }
    expect(provider.list()).toHaveLength(2);
    expect(provider.list()[0]?.subject).toBe("4");
  });

  it("latestFor returns the most recent message for a recipient", async () => {
    const provider = new InMemoryEmailProvider({ logger: () => {} });
    await provider.send({ to: "x@x.test", subject: "first", text: "1" });
    await provider.send({ to: "y@x.test", subject: "other", text: "2" });
    await provider.send({ to: "x@x.test", subject: "second", text: "3" });

    const latest = provider.latestFor("x@x.test");
    expect(latest?.subject).toBe("second");
  });
});

describe("buildEmailProvider", () => {
  it("falls back to InMemory when no env config provided", async () => {
    const provider = await buildEmailProvider({ env: {}, logger: () => {} });
    expect(provider.name).toBe("inmemory");
  });
});
