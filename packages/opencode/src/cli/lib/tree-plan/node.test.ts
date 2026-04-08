import { describe, expect, it } from "bun:test"
import type { PlanNode, TaskMetadata } from "./node"
import { isPlanNode, isTaskType, isTaskStatus, isTaskMetadata, createNode, createRoot, addChild } from "./node"

describe("PlanNode types", () => {
  describe("isTaskType", () => {
    it("accepts valid task types", () => {
      expect(isTaskType("analysis")).toBe(true)
      expect(isTaskType("design")).toBe(true)
      expect(isTaskType("code")).toBe(true)
      expect(isTaskType("test")).toBe(true)
      expect(isTaskType("ops")).toBe(true)
    })

    it("rejects invalid task types", () => {
      expect(isTaskType("invalid")).toBe(false)
      expect(isTaskType("")).toBe(false)
      expect(isTaskType(123)).toBe(false)
      expect(isTaskType(null)).toBe(false)
      expect(isTaskType(undefined)).toBe(false)
    })
  })

  describe("isTaskStatus", () => {
    it("accepts valid task statuses", () => {
      expect(isTaskStatus("todo")).toBe(true)
      expect(isTaskStatus("in_progress")).toBe(true)
      expect(isTaskStatus("blocked")).toBe(true)
      expect(isTaskStatus("needs_review")).toBe(true)
      expect(isTaskStatus("done")).toBe(true)
    })

    it("rejects invalid task statuses", () => {
      expect(isTaskStatus("invalid")).toBe(false)
      expect(isTaskStatus("")).toBe(false)
      expect(isTaskStatus(123)).toBe(false)
      expect(isTaskStatus(null)).toBe(false)
      expect(isTaskStatus(undefined)).toBe(false)
    })
  })

  describe("isTaskMetadata", () => {
    it("accepts valid metadata with all fields", () => {
      const m: TaskMetadata = {
        action_hint: "test hint",
        resources: ["file.ts", "module.js"],
      }
      expect(isTaskMetadata(m)).toBe(true)
    })

    it("accepts valid metadata with optional action_hint", () => {
      expect(isTaskMetadata({ action_hint: "test" })).toBe(true)
    })

    it("accepts valid metadata with optional resources", () => {
      expect(isTaskMetadata({ resources: ["file.ts"] })).toBe(true)
    })

    it("accepts empty metadata object", () => {
      expect(isTaskMetadata({})).toBe(true)
    })

    it("rejects metadata with invalid action_hint type", () => {
      expect(isTaskMetadata({ action_hint: 123 })).toBe(false)
      expect(isTaskMetadata({ action_hint: null })).toBe(false)
    })

    it("rejects metadata with invalid resources type", () => {
      expect(isTaskMetadata({ resources: "not-array" })).toBe(false)
      expect(isTaskMetadata({ resources: [123] })).toBe(false)
      expect(isTaskMetadata({ resources: [null] })).toBe(false)
    })

    it("rejects non-object metadata", () => {
      expect(isTaskMetadata(null)).toBe(false)
      expect(isTaskMetadata("string")).toBe(false)
      expect(isTaskMetadata(123)).toBe(false)
      expect(isTaskMetadata(undefined)).toBe(false)
    })
  })

  describe("isPlanNode", () => {
    it("validates a complete PlanNode", () => {
      const node: PlanNode = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        task: "Test task",
        type: "code",
        status: "todo",
        priority: 1,
        children: [],
        depends_on: [],
        metadata: { resources: [] },
      }
      expect(isPlanNode(node)).toBe(true)
    })

    it("validates PlanNode with nested children", () => {
      const child: PlanNode = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        task: "Child task",
        type: "design",
        status: "done",
        priority: 2,
        children: [],
        depends_on: ["550e8400-e29b-41d4-a716-446655440000"],
        metadata: { action_hint: "test", resources: ["file.ts"] },
      }

      const parent: PlanNode = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        task: "Parent task",
        type: "code",
        status: "in_progress",
        priority: 1,
        children: [child],
        depends_on: [],
        metadata: {},
      }

      expect(isPlanNode(parent)).toBe(true)
      expect(isPlanNode(child)).toBe(true)
    })

    it("rejects node with missing required fields", () => {
      expect(isPlanNode({ task: "Test", type: "code" })).toBe(false)
      expect(isPlanNode({ id: "test" })).toBe(false)
      expect(isPlanNode({})).toBe(false)
    })

    it("rejects node with invalid field types", () => {
      expect(
        isPlanNode({
          id: 123,
          task: "Test",
          type: "code",
          status: "todo",
          priority: 1,
          children: [],
          depends_on: [],
          metadata: {},
        }),
      ).toBe(false)

      expect(
        isPlanNode({
          id: "test",
          task: 123,
          type: "code",
          status: "todo",
          priority: 1,
          children: [],
          depends_on: [],
          metadata: {},
        }),
      ).toBe(false)

      expect(
        isPlanNode({
          id: "test",
          task: "Test",
          type: "invalid",
          status: "todo",
          priority: 1,
          children: [],
          depends_on: [],
          metadata: {},
        }),
      ).toBe(false)

      expect(
        isPlanNode({
          id: "test",
          task: "Test",
          type: "code",
          status: "invalid",
          priority: 1,
          children: [],
          depends_on: [],
          metadata: {},
        }),
      ).toBe(false)
    })

    it("rejects node with invalid children array", () => {
      expect(
        isPlanNode({
          id: "test",
          task: "Test",
          type: "code",
          status: "todo",
          priority: 1,
          children: [{ invalid: "child" }],
          depends_on: [],
          metadata: {},
        }),
      ).toBe(false)
    })

    it("rejects node with invalid depends_on array", () => {
      expect(
        isPlanNode({
          id: "test",
          task: "Test",
          type: "code",
          status: "todo",
          priority: 1,
          children: [],
          depends_on: [123],
          metadata: {},
        }),
      ).toBe(false)
    })

    it("rejects non-object values", () => {
      expect(isPlanNode(null)).toBe(false)
      expect(isPlanNode(undefined)).toBe(false)
      expect(isPlanNode("string")).toBe(false)
      expect(isPlanNode(123)).toBe(false)
      expect(isPlanNode([])).toBe(false)
    })
  })

  describe("createNode", () => {
    it("creates node with defaults", () => {
      const node = createNode("Test task")

      expect(node.task).toBe("Test task")
      expect(typeof node.id).toBe("string")
      expect(node.id.length).toBeGreaterThan(0)
      expect(node.type).toBe("code")
      expect(node.status).toBe("todo")
      expect(node.priority).toBe(0)
      expect(node.children).toEqual([])
      expect(node.depends_on).toEqual([])
      expect(node.metadata).toEqual({ resources: [] })
    })

    it("creates valid PlanNode", () => {
      const node = createNode("Another task")
      expect(isPlanNode(node)).toBe(true)
    })

    it("generates unique IDs", () => {
      const node1 = createNode("Task 1")
      const node2 = createNode("Task 2")

      expect(node1.id).not.toBe(node2.id)
    })
  })

  describe("createRoot", () => {
    it("creates root node equivalent to createNode", () => {
      const node = createNode("Root")
      const root = createRoot("Root")

      expect(root.task).toBe(node.task)
      expect(root.type).toBe(node.type)
      expect(root.status).toBe(node.status)
      expect(root.priority).toBe(node.priority)
      expect(root.children).toEqual(node.children)
      expect(root.depends_on).toEqual(node.depends_on)
      expect(root.metadata).toEqual(node.metadata)
    })

    it("creates valid PlanNode", () => {
      const root = createRoot("My Plan")
      expect(isPlanNode(root)).toBe(true)
    })
  })

  describe("addChild", () => {
    it("adds child to parent", () => {
      const parent = createNode("Parent")
      const child = addChild(parent, "Child")

      expect(parent.children).toHaveLength(1)
      expect(parent.children[0]).toBe(child)
    })

    it("returns newly created child", () => {
      const parent = createNode("Parent")
      const child = addChild(parent, "Child task")

      expect(child.task).toBe("Child task")
      expect(child.type).toBe("code")
      expect(child.status).toBe("todo")
    })

    it("child has unique ID distinct from parent", () => {
      const parent = createNode("Parent")
      const child = addChild(parent, "Child")

      expect(child.id).not.toBe(parent.id)
    })

    it("creates valid PlanNode for child", () => {
      const parent = createNode("Parent")
      const child = addChild(parent, "Child")

      expect(isPlanNode(child)).toBe(true)
      expect(isPlanNode(parent)).toBe(true)
    })

    it("adds multiple children", () => {
      const parent = createNode("Parent")
      const child1 = addChild(parent, "Child 1")
      const child2 = addChild(parent, "Child 2")

      expect(parent.children).toHaveLength(2)
      expect(parent.children[0]).toBe(child1)
      expect(parent.children[1]).toBe(child2)
      expect(isPlanNode(parent)).toBe(true)
    })
  })
})
