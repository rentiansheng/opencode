/**
 * PlanNode types and utilities for hierarchical task trees
 */

import { generateId } from "./id"

/**
 * Task type taxonomy
 */
export type TaskType = "analysis" | "design" | "code" | "test" | "ops"

/**
 * Task execution status
 */
export type TaskStatus = "todo" | "in_progress" | "blocked" | "needs_review" | "done"

/**
 * Execution mode for plan display/output
 */
export type ExecutionMode = "sequential" | "parallel"

/**
 * Metadata for task tracking and conflict detection
 */
export interface TaskMetadata {
  /**
   * Hint for task executor about how to approach this task
   */
  action_hint?: string
  /**
   * Array of resource identifiers for conflict detection
   * Examples: file paths, module names, etc.
   */
  resources?: string[]
}

/**
 * A node in the hierarchical task plan tree
 */
export interface PlanNode {
  /**
   * Unique identifier for this node
   */
  id: string
  /**
   * Human-readable task description
   */
  task: string
  /**
   * Task type taxonomy (analysis, design, code, test, ops)
   */
  type: TaskType
  /**
   * Current execution status
   */
  status: TaskStatus
  /**
   * Priority level (higher = more important)
   */
  priority: number
  /**
   * Child task nodes
   */
  children: PlanNode[]
  /**
   * Array of task IDs this task depends on
   */
  depends_on: string[]
  /**
   * Additional metadata for task tracking
   */
  metadata: TaskMetadata
}

/**
 * Type guard to check if value is a valid PlanNode
 * @param value - Value to check
 * @returns true if value conforms to PlanNode interface
 */
export function isPlanNode(value: unknown): value is PlanNode {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === "string" &&
    typeof obj.task === "string" &&
    isTaskType(obj.type) &&
    isTaskStatus(obj.status) &&
    typeof obj.priority === "number" &&
    Array.isArray(obj.children) &&
    obj.children.every(isPlanNode) &&
    Array.isArray(obj.depends_on) &&
    obj.depends_on.every((dep) => typeof dep === "string") &&
    typeof obj.metadata === "object" &&
    obj.metadata !== null &&
    isTaskMetadata(obj.metadata)
  )
}

/**
 * Type guard to check if value is a valid TaskType
 * @param value - Value to check
 * @returns true if value is a valid TaskType
 */
export function isTaskType(value: unknown): value is TaskType {
  return value === "analysis" || value === "design" || value === "code" || value === "test" || value === "ops"
}

/**
 * Type guard to check if value is a valid TaskStatus
 * @param value - Value to check
 * @returns true if value is a valid TaskStatus
 */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    value === "todo" || value === "in_progress" || value === "blocked" || value === "needs_review" || value === "done"
  )
}

/**
 * Type guard to check if value is a valid TaskMetadata
 * @param value - Value to check
 * @returns true if value conforms to TaskMetadata interface
 */
export function isTaskMetadata(value: unknown): value is TaskMetadata {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const obj = value as Record<string, unknown>

  // All fields are optional, but if present must be correct type
  if (obj.action_hint !== undefined && typeof obj.action_hint !== "string") {
    return false
  }

  if (obj.resources !== undefined) {
    if (!Array.isArray(obj.resources)) {
      return false
    }
    if (!obj.resources.every((res) => typeof res === "string")) {
      return false
    }
  }

  return true
}

/**
 * Creates a new PlanNode with sensible defaults
 * @param task - Human-readable task description
 * @returns New PlanNode with defaults
 */
export function createNode(task: string): PlanNode {
  return {
    id: generateId(),
    task,
    type: "code",
    status: "todo",
    priority: 0,
    children: [],
    depends_on: [],
    metadata: {
      resources: [],
    },
  }
}

/**
 * Creates a root node for a plan tree
 * @param task - Human-readable task description
 * @returns Root PlanNode
 */
export function createRoot(task: string): PlanNode {
  return createNode(task)
}

/**
 * Adds a child node to a parent node
 * @param parent - Parent node
 * @param task - Child task description
 * @returns The newly created child node
 */
export function addChild(parent: PlanNode, task: string): PlanNode {
  const child = createNode(task)
  parent.children.push(child)
  return child
}
