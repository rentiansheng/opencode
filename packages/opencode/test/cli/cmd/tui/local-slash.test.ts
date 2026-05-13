import { describe, expect, test } from "bun:test"
import { matchLocalSlash } from "../../../../src/cli/cmd/tui/component/prompt/local-slash"

const slashes = [
  { display: "/end", aliases: ["/follow"], onSelect: () => {} },
  { display: "/help", onSelect: () => {} },
]

describe("matchLocalSlash", () => {
  test("matches by display name", () => {
    expect(matchLocalSlash(slashes, "end")).toBeDefined()
  })

  test("matches by alias", () => {
    expect(matchLocalSlash(slashes, "follow")).toBeDefined()
  })

  test("returns undefined for unknown token", () => {
    expect(matchLocalSlash(slashes, "unknown")).toBeUndefined()
  })

  test("is case-insensitive", () => {
    expect(matchLocalSlash(slashes, "END")).toBeDefined()
    expect(matchLocalSlash(slashes, "FOLLOW")).toBeDefined()
  })

  test("returns the correct onSelect function", () => {
    let called = false
    const s = [{ display: "/end", onSelect: () => {
      called = true
    } }]
    matchLocalSlash(s, "end")?.()
    expect(called).toBe(true)
  })
})
