import { describe, it, expect } from "bun:test"
import { generateId, isValidId, shortId } from "./id"

describe("id utilities", () => {
  it("generateId returns UUID v4 format", () => {
    const id = generateId()
    expect(isValidId(id)).toBe(true)
    expect(id.length).toBe(36) // Standard UUID length with hyphens
  })

  it("generates 100 unique UUIDs", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const id = generateId()
      expect(isValidId(id)).toBe(true)
      ids.add(id)
    }
    expect(ids.size).toBe(100) // All unique
  })

  it("isValidId accepts valid UUID v4", () => {
    const validIds = [
      "550e8400-e29b-41d4-a716-446655440000",
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "12345678-1234-4234-8234-123456789012",
    ]
    for (const id of validIds) {
      expect(isValidId(id)).toBe(true)
    }
  })

  it("isValidId rejects invalid formats", () => {
    const invalid = [
      "not-a-uuid",
      "550e8400-e29b-41d4-a716-44665544000", // Too short
      "550e8400-e29b-41d4-a716-446655440000-extra", // Too long
      "550e8400-e29b-31d4-a716-446655440000", // Wrong version (3 instead of 4)
      "550e8400-e29b-41d4-c716-446655440000", // Wrong variant
      "",
    ]
    for (const id of invalid) {
      expect(isValidId(id)).toBe(false)
    }
  })

  it("shortId returns first 8 characters", () => {
    const id = generateId()
    const short = shortId(id)
    expect(short).toBe(id.slice(0, 8))
    expect(short.length).toBe(8)
  })

  it("shortId works with any string", () => {
    expect(shortId("hello")).toBe("hello")
    expect(shortId("12345678901")).toBe("12345678")
  })
})
