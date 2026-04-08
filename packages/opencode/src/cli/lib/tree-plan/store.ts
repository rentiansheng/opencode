import path from "path"
import { mkdirSync, readdirSync, existsSync } from "fs"
import { isPlanNode } from "./node"
import type { PlanNode } from "./node"
import { shortId } from "./id"

function gitRoot(dir: string): string | undefined {
  let cur = dir
  while (true) {
    if (existsSync(path.join(cur, ".git"))) return cur
    const parent = path.dirname(cur)
    if (parent === cur) return undefined
    cur = parent
  }
}

function planDir(name: string): string {
  const root = gitRoot(process.cwd())
  const base = root ? path.join(root, ".opencode", "tree-plan") : path.join(process.cwd(), ".opencode", "tree-plan")
  return path.join(base, name)
}

export function renderMarkdown(root: PlanNode, depth = 0): string {
  const indent = "  ".repeat(depth)
  const box = root.status === "done" ? "[x]" : "[ ]"
  let line = `${indent}- ${box} ${root.task} (type: ${root.type}, status: ${root.status})`

  if (root.metadata.action_hint) line += ` — hint: ${root.metadata.action_hint}`
  if (root.metadata.resources && root.metadata.resources.length > 0)
    line += ` [resources: ${root.metadata.resources.join(", ")}]`
  if (root.depends_on.length > 0) line += ` [depends: ${root.depends_on.map(shortId).join(", ")}]`

  if (root.status === "blocked" || root.status === "needs_review") line = `> ⚠️ ${line}`

  const childLines = root.children.map((c) => renderMarkdown(c, depth + 1)).join("\n")
  return childLines ? `${line}\n${childLines}` : line
}

export async function save(name: string, root: PlanNode): Promise<void> {
  const dir = planDir(name)
  mkdirSync(dir, { recursive: true })
  await Bun.write(path.join(dir, "plan.json"), JSON.stringify(root, null, 2))
  await Bun.write(path.join(dir, "PLAN.md"), renderMarkdown(root))
}

export async function load(name: string): Promise<PlanNode> {
  const file = path.join(planDir(name), "plan.json")
  const data = await Bun.file(file).json()
  if (!isPlanNode(data)) throw new Error(`Invalid PlanNode in ${file}`)
  return data
}

export function exists(name: string): boolean {
  return existsSync(path.join(planDir(name), "plan.json"))
}

export function list(): string[] {
  const root = gitRoot(process.cwd())
  const base = root ? path.join(root, ".opencode", "tree-plan") : path.join(process.cwd(), ".opencode", "tree-plan")
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}
