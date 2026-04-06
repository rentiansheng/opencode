import { randomUUID } from "crypto"

export type PlanNode = {
  id: string
  title: string
  parentId: string | null
  order: number
  children: PlanNode[]
  branchId?: string
}

export function createRoot(title: string): PlanNode {
  return { id: randomUUID(), title, parentId: null, order: 1, children: [] }
}

export function findNode(root: PlanNode, id: string): PlanNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

export function addChild(parent: PlanNode, title: string): PlanNode {
  const child: PlanNode = {
    id: randomUUID(),
    title,
    parentId: parent.id,
    order: parent.children.length + 1,
    children: [],
  }
  parent.children.push(child)
  return child
}
