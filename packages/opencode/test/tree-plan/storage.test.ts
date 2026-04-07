import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { createRoot, addChild } from "../../src/cli/lib/tree-plan/node"
import { savePlan, loadPlan, saveBranch, loadBranch } from "../../src/cli/lib/tree-plan/storage"
import { planPath, atomicWriteJson } from "../../src/cli/lib/tree-plan/paths"
import type { PlanNode } from "../../src/cli/lib/tree-plan/node"

describe("savePlan / loadPlan", () => {
  test("round-trip preserves all fields", async () => {
    await using tmp = await tmpdir()
    const orig = process.env.OPENCODE_TEST_HOME
    process.env.OPENCODE_TEST_HOME = tmp.path
    try {
      const root = createRoot("My Plan")
      addChild(root, "Task A", {
        type: "test",
        status: "blocked",
        depends_on: ["abc"],
        action_hint: "run tests",
        resources: ["auth.ts"],
      })
      await savePlan("tp", root)
      const loaded = await loadPlan("tp")
      expect(loaded.title).toBe("My Plan")
      const child = loaded.children[0]
      expect(child.type).toBe("test")
      expect(child.status).toBe("blocked")
      expect(child.depends_on).toEqual(["abc"])
      expect(child.metadata.action_hint).toBe("run tests")
      expect(child.metadata.resources).toEqual(["auth.ts"])
    } finally {
      process.env.OPENCODE_TEST_HOME = orig
    }
  })

  test("auto-writes plan.md alongside plan.json", async () => {
    await using tmp = await tmpdir()
    const orig = process.env.OPENCODE_TEST_HOME
    process.env.OPENCODE_TEST_HOME = tmp.path
    try {
      const root = createRoot("MD Test")
      await savePlan("mdtest", root)
      const mdPath = planPath("mdtest").replace(/\.json$/, ".md")
      expect(await Bun.file(mdPath).exists()).toBe(true)
    } finally {
      process.env.OPENCODE_TEST_HOME = orig
    }
  })

  test("fillDefaults: loads legacy JSON missing new fields", async () => {
    await using tmp = await tmpdir()
    const orig = process.env.OPENCODE_TEST_HOME
    process.env.OPENCODE_TEST_HOME = tmp.path
    try {
      // Legacy node without type/status/depends_on/metadata
      const legacy = {
        id: "aaaa-1111",
        title: "Legacy Plan",
        parentId: null,
        order: 1,
        children: [
          {
            id: "bbbb-2222",
            title: "Old Task",
            parentId: "aaaa-1111",
            order: 1,
            children: [],
          },
        ],
      }
      await atomicWriteJson(planPath("legacy"), legacy)
      const loaded = await loadPlan("legacy")
      expect(loaded.type).toBe("code")
      expect(loaded.status).toBe("todo")
      expect(loaded.depends_on).toEqual([])
      expect(loaded.metadata.resources).toEqual([])
      const child = loaded.children[0]
      expect(child.type).toBe("code")
      expect(child.status).toBe("todo")
      expect(child.depends_on).toEqual([])
      expect(child.metadata.resources).toEqual([])
    } finally {
      process.env.OPENCODE_TEST_HOME = orig
    }
  })

  test("validate rejects duplicate IDs", async () => {
    await using tmp = await tmpdir()
    const orig = process.env.OPENCODE_TEST_HOME
    process.env.OPENCODE_TEST_HOME = tmp.path
    try {
      const root = createRoot("root")
      const child = addChild(root, "A")
      // Force duplicate id
      child.id = root.id
      await expect(savePlan("dup", root)).rejects.toThrow("Duplicate")
    } finally {
      process.env.OPENCODE_TEST_HOME = orig
    }
  })
})

describe("saveBranch / loadBranch", () => {
  test("round-trip preserves fields", async () => {
    await using tmp = await tmpdir()
    const orig = process.env.OPENCODE_TEST_HOME
    process.env.OPENCODE_TEST_HOME = tmp.path
    try {
      const root = createRoot("root")
      await savePlan("bp", root)
      const sub = addChild(root, "Sub", { type: "design", status: "in_progress" })
      await saveBranch("bp", "feature", sub)
      const loaded = await loadBranch("bp", "feature")
      expect(loaded.title).toBe("Sub")
      expect(loaded.type).toBe("design")
      expect(loaded.status).toBe("in_progress")
    } finally {
      process.env.OPENCODE_TEST_HOME = orig
    }
  })
})
