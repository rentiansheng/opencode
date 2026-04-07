import { describe, test, expect } from "bun:test"
import { createRoot, addChild, findNode } from "../../src/cli/lib/tree-plan/node"

describe("createRoot", () => {
  test("defaults", () => {
    const root = createRoot("My Plan")
    expect(root.title).toBe("My Plan")
    expect(root.parentId).toBeNull()
    expect(root.order).toBe(1)
    expect(root.children).toEqual([])
    expect(root.type).toBe("code")
    expect(root.status).toBe("todo")
    expect(root.depends_on).toEqual([])
    expect(root.metadata.resources).toEqual([])
    expect(typeof root.id).toBe("string")
    expect(root.id.length).toBeGreaterThan(0)
  })
})

describe("addChild", () => {
  test("default opts", () => {
    const root = createRoot("root")
    const child = addChild(root, "Task A")
    expect(child.title).toBe("Task A")
    expect(child.parentId).toBe(root.id)
    expect(child.order).toBe(1)
    expect(child.type).toBe("code")
    expect(child.status).toBe("todo")
    expect(child.depends_on).toEqual([])
    expect(child.metadata.resources).toEqual([])
    expect(child.metadata.action_hint).toBeUndefined()
    expect(root.children).toHaveLength(1)
    expect(root.children[0]).toBe(child)
  })

  test("order increments for multiple children", () => {
    const root = createRoot("root")
    const a = addChild(root, "A")
    const b = addChild(root, "B")
    const c = addChild(root, "C")
    expect(a.order).toBe(1)
    expect(b.order).toBe(2)
    expect(c.order).toBe(3)
  })

  test("all opts", () => {
    const root = createRoot("root")
    const child = addChild(root, "Task X", {
      type: "test",
      status: "blocked",
      depends_on: ["abc"],
      action_hint: "do X",
      resources: ["auth.ts"],
    })
    expect(child.type).toBe("test")
    expect(child.status).toBe("blocked")
    expect(child.depends_on).toEqual(["abc"])
    expect(child.metadata.action_hint).toBe("do X")
    expect(child.metadata.resources).toEqual(["auth.ts"])
  })
})

describe("findNode", () => {
  test("finds root", () => {
    const root = createRoot("root")
    expect(findNode(root, root.id)).toBe(root)
  })

  test("finds deep child", () => {
    const root = createRoot("root")
    const a = addChild(root, "A")
    const b = addChild(a, "B")
    expect(findNode(root, b.id)).toBe(b)
  })

  test("returns null for unknown id", () => {
    const root = createRoot("root")
    expect(findNode(root, "nonexistent-id")).toBeNull()
  })
})
