import { describe, test, expect } from "bun:test"
import { render } from "../../src/cli/lib/tree-plan/markdown"
import { createRoot, addChild } from "../../src/cli/lib/tree-plan/node"

describe("render", () => {
  test("no children", () => {
    const root = createRoot("My Plan")
    expect(render(root)).toBe("# My Plan")
  })

  test("one child default (code/todo) shows id suffix", () => {
    const root = createRoot("root")
    addChild(root, "Task A")
    const out = render(root)
    expect(out).toContain("- [ ] 1 Task A")
    expect(out).toContain("(id: ")
  })

  test("done status shows [x]", () => {
    const root = createRoot("root")
    addChild(root, "Task A", { status: "done" })
    expect(render(root)).toContain("[x]")
  })

  test("blocked status shows [BLOCKED]", () => {
    const root = createRoot("root")
    addChild(root, "Task A", { status: "blocked" })
    expect(render(root)).toContain("[BLOCKED]")
  })

  test("needs_review status shows [REVIEW]", () => {
    const root = createRoot("root")
    addChild(root, "Task A", { status: "needs_review" })
    expect(render(root)).toContain("[REVIEW]")
  })

  test("non-code type shows (type: ...)", () => {
    const root = createRoot("root")
    addChild(root, "Task A", { type: "test" })
    expect(render(root)).toContain("(type: test)")
  })

  test("depends_on shows (depends_on: ...)", () => {
    const root = createRoot("root")
    const a = addChild(root, "A")
    addChild(root, "B", { depends_on: [a.id] })
    const out = render(root)
    expect(out).toContain("(depends_on: ")
  })

  test("action_hint shows (hint: ...)", () => {
    const root = createRoot("root")
    addChild(root, "Task A", { action_hint: "run migrations" })
    expect(render(root)).toContain("(hint: run migrations)")
  })

  test("resources shows (resources: ...)", () => {
    const root = createRoot("root")
    addChild(root, "Task A", { resources: ["auth.ts"] })
    expect(render(root)).toContain("(resources: auth.ts)")
  })

  test("nested children indented by 2 spaces per level", () => {
    const root = createRoot("root")
    const a = addChild(root, "A")
    addChild(a, "B")
    const lines = render(root).split("\n")
    const aLine = lines.find((l) => l.includes("A"))!
    const bLine = lines.find((l) => l.includes("B"))!
    expect(aLine.startsWith("- ")).toBe(true)
    expect(bLine.startsWith("  - ")).toBe(true)
  })
})
