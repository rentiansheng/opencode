import * as prompts from "@clack/prompts"
import { UI } from "../../ui"
import type { PlanNode } from "./node"

function shortId(root: PlanNode, id: string): string {
  const all: string[] = []
  function collect(n: PlanNode) {
    all.push(n.id)
    for (const child of n.children) collect(child)
  }
  collect(root)

  for (let len = 8; len <= 36; len++) {
    const shorts = all.map((x) => x.slice(0, len))
    if (new Set(shorts).size === all.length) {
      return id.slice(0, len)
    }
  }
  return id
}

function breadcrumb(root: PlanNode, id: string): string {
  function find(node: PlanNode, trail: string[]): string[] | null {
    if (node.id === id) return trail
    for (const child of node.children) {
      const result = find(child, [...trail, child.title])
      if (result) return result
    }
    return null
  }
  return find(root, [root.title])?.join(" > ") ?? id
}

function allNodes(root: PlanNode): PlanNode[] {
  const result: PlanNode[] = [root]
  for (const child of root.children) result.push(...allNodes(child))
  return result
}

export async function selectNode(root: PlanNode, message: string): Promise<PlanNode> {
  const nodes = allNodes(root)
  const selected = await prompts.autocomplete({
    message,
    maxItems: 10,
    options: nodes.map((n) => ({
      label: `${shortId(root, n.id)}  ${breadcrumb(root, n.id)}  —  ${n.title}`,
      value: n.id,
    })),
    output: process.stderr,
  })

  if (prompts.isCancel(selected)) throw new UI.CancelledError()
  return nodes.find((n) => n.id === selected)!
}
