import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { tmpdir } from "os"
import path from "path"
import { mkdirSync, rmSync } from "fs"
import { createRoot, addChild } from "./node"

// We'll override process.cwd() by setting up a mock git root directory
// Since store.ts uses process.cwd() → gitRoot(), we redirect with a temp dir that has .git

let tmp: string
let origCwd: () => string

beforeEach(() => {
  tmp = path.join(tmpdir(), `store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(path.join(tmp, ".git"), { recursive: true })
  origCwd = process.cwd.bind(process)
  // @ts-ignore
  process.cwd = () => tmp
})

afterEach(() => {
  // @ts-ignore
  process.cwd = origCwd
  rmSync(tmp, { recursive: true, force: true })
})

// Lazy import to pick up mocked process.cwd
async function store() {
  return import("./store")
}

describe("renderMarkdown", () => {
  it("renders root node with todo status", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("My plan")
    const md = renderMarkdown(root)
    expect(md).toContain("[ ]")
    expect(md).toContain("My plan")
    expect(md).toContain("type: code")
    expect(md).toContain("status: todo")
  })

  it("renders done status with [x]", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("Done task")
    root.status = "done"
    const md = renderMarkdown(root)
    expect(md).toContain("[x]")
  })

  it("prefixes blocked with warning", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("Blocked task")
    root.status = "blocked"
    const md = renderMarkdown(root)
    expect(md).toContain("> ⚠️")
  })

  it("prefixes needs_review with warning", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("Review task")
    root.status = "needs_review"
    const md = renderMarkdown(root)
    expect(md).toContain("> ⚠️")
  })

  it("appends action_hint when present", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("Hinted task")
    root.metadata.action_hint = "use TDD"
    const md = renderMarkdown(root)
    expect(md).toContain("— hint: use TDD")
  })

  it("appends resources when non-empty", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("Resource task")
    root.metadata.resources = ["src/foo.ts", "src/bar.ts"]
    const md = renderMarkdown(root)
    expect(md).toContain("[resources: src/foo.ts, src/bar.ts]")
  })

  it("appends short depends_on IDs", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("Dep task")
    root.depends_on = ["550e8400-e29b-41d4-a716-446655440000"]
    const md = renderMarkdown(root)
    expect(md).toContain("[depends: 550e8400]")
  })

  it("renders children with indentation", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("Parent")
    addChild(root, "Child")
    const md = renderMarkdown(root)
    const lines = md.split("\n")
    expect(lines[0]).toMatch(/^- /)
    expect(lines[1]).toMatch(/^  - /)
  })

  it("renders deep nesting", async () => {
    const { renderMarkdown } = await store()
    const root = createRoot("L0")
    const child = addChild(root, "L1")
    addChild(child, "L2")
    const md = renderMarkdown(root)
    const lines = md.split("\n")
    expect(lines[0]).toMatch(/^- /)
    expect(lines[1]).toMatch(/^  - /)
    expect(lines[2]).toMatch(/^    - /)
  })
})

describe("save and load", () => {
  it("saves and loads a plan", async () => {
    const { save, load } = await store()
    const root = createRoot("My test plan")
    await save("myplan", root)
    const loaded = await load("myplan")
    expect(loaded.task).toBe("My test plan")
    expect(loaded.id).toBe(root.id)
  })

  it("save writes PLAN.md alongside plan.json", async () => {
    const { save } = await store()
    const root = createRoot("Plan with MD")
    await save("mdplan", root)
    const md = await Bun.file(path.join(tmp, ".opencode", "tree-plan", "mdplan", "PLAN.md")).text()
    expect(md).toContain("Plan with MD")
  })

  it("PLAN.md content matches renderMarkdown output", async () => {
    const { save, renderMarkdown } = await store()
    const root = createRoot("Render test")
    addChild(root, "Child one")
    await save("rendertest", root)
    const md = await Bun.file(path.join(tmp, ".opencode", "tree-plan", "rendertest", "PLAN.md")).text()
    expect(md).toBe(renderMarkdown(root))
  })

  it("load throws on invalid JSON", async () => {
    const { save } = await store()
    const root = createRoot("Valid plan")
    await save("broken", root)
    // Overwrite plan.json with invalid node data
    await Bun.write(path.join(tmp, ".opencode", "tree-plan", "broken", "plan.json"), JSON.stringify({ invalid: true }))
    const { load } = await store()
    await expect(load("broken")).rejects.toThrow("Invalid PlanNode")
  })

  it("round-trips nested tree", async () => {
    const { save, load } = await store()
    const root = createRoot("Root node")
    const child = addChild(root, "Child node")
    child.status = "done"
    child.metadata.action_hint = "be careful"
    child.metadata.resources = ["a.ts"]
    await save("nested", root)
    const loaded = await load("nested")
    expect(loaded.children).toHaveLength(1)
    expect(loaded.children[0].task).toBe("Child node")
    expect(loaded.children[0].status).toBe("done")
    expect(loaded.children[0].metadata.action_hint).toBe("be careful")
  })
})

describe("exists", () => {
  it("returns false when plan does not exist", async () => {
    const { exists } = await store()
    expect(exists("nonexistent")).toBe(false)
  })

  it("returns true after save", async () => {
    const { save, exists } = await store()
    await save("checkme", createRoot("Check"))
    expect(exists("checkme")).toBe(true)
  })
})

describe("list", () => {
  it("returns empty array when no plans", async () => {
    const { list } = await store()
    expect(list()).toEqual([])
  })

  it("returns sorted plan names", async () => {
    const { save, list } = await store()
    await save("zebra", createRoot("Z"))
    await save("alpha", createRoot("A"))
    await save("middle", createRoot("M"))
    const names = list()
    expect(names).toEqual(["alpha", "middle", "zebra"])
  })

  it("includes all saved plans", async () => {
    const { save, list } = await store()
    await save("plan1", createRoot("P1"))
    await save("plan2", createRoot("P2"))
    const names = list()
    expect(names).toContain("plan1")
    expect(names).toContain("plan2")
    expect(names).toHaveLength(2)
  })
})
