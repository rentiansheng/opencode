import type { PlanNode } from "./node"

function shortIds(root: PlanNode): Map<string, string> {
  const all: string[] = []
  function collect(n: PlanNode) {
    all.push(n.id)
    for (const child of n.children) collect(child)
  }
  collect(root)

  for (let len = 8; len <= 36; len++) {
    const shorts = all.map((id) => id.slice(0, len))
    const unique = new Set(shorts)
    if (unique.size === all.length) {
      const map = new Map<string, string>()
      all.forEach((id, i) => map.set(id, shorts[i]))
      return map
    }
  }
  const map = new Map<string, string>()
  all.forEach((id) => map.set(id, id))
  return map
}

function number(node: PlanNode, prefix: string): Map<string, string> {
  const map = new Map<string, string>()
  node.children.forEach((child, i) => {
    const n = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
    map.set(child.id, n)
    const sub = number(child, n)
    for (const [k, v] of sub) map.set(k, v)
  })
  return map
}

export function render(root: PlanNode, full = false): string {
  const shorts = full ? null : shortIds(root)
  const nums = number(root, "")
  const lines: string[] = [`# ${root.title}`]

  function walk(node: PlanNode, depth: number) {
    for (const child of node.children) {
      const indent = "  ".repeat(depth)
      const id = full ? child.id : shorts!.get(child.id)!
      const num = nums.get(child.id) ?? "?"
      lines.push(`${indent}- ${num} ${child.title} (id: ${id})`)
      walk(child, depth + 1)
    }
  }
  walk(root, 0)
  return lines.join("\n")
}
