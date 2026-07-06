import { describe, expect, it } from "vitest";

import { newId } from "../src/id";

describe("newId", () => {
  it("returns UUIDv7 identifiers", () => {
    const id = newId();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("is monotonic for identifiers generated in one process", () => {
    const ids = Array.from({ length: 100 }, () => newId());
    const sorted = [...ids].sort();

    expect(ids).toEqual(sorted);
  });
});
