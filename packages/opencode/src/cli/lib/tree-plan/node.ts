import { randomUUID } from "crypto"

export type TaskType =
  | "analysis"
  | "design"
  | "code"
  | "test"
  | "refactor"
  | "debug"
  | "review"
  | "docs"
  | "ops"
  | "research"

export type TaskStatus = "todo" | "in_progress" | "blocked" | "needs_review" | "done"

export type PlanNode = {
  id: string
  title: string
  parentId: string | null
  order: number
  children: PlanNode[]
  branchId?: string
  type: TaskType
  status: TaskStatus
  depends_on: string[]
  metadata: {
    action_hint?: string
    resources?: string[]
  }
}

export function createRoot(title: string): PlanNode {
  return {
    id: randomUUID(),
    title,
    parentId: null,
    order: 1,
    children: [],
    type: "code",
    status: "todo",
    depends_on: [],
    metadata: { resources: [] },
  }
}

export function findNode(root: PlanNode, id: string): PlanNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

export function addChild(
  parent: PlanNode,
  title: string,
  opts?: {
    type?: TaskType
    status?: TaskStatus
    depends_on?: string[]
    action_hint?: string
    resources?: string[]
  },
): PlanNode {
  const child: PlanNode = {
    id: randomUUID(),
    title,
    parentId: parent.id,
    order: parent.children.length + 1,
    children: [],
    type: opts?.type ?? "code",
    status: opts?.status ?? "todo",
    depends_on: opts?.depends_on ?? [],
    metadata: {
      ...(opts?.action_hint ? { action_hint: opts.action_hint } : {}),
      resources: opts?.resources ?? [],
    },
  }
  parent.children.push(child)
  return child
}
