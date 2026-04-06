import { readFile } from "fs/promises"
import type { PlanNode } from "./node"
import { planPath, branchPath, currentPlanPath, atomicWriteJson, atomicWriteText } from "./paths"

function ids(node: PlanNode, out: Set<string> = new Set()): Set<string> {
  out.add(node.id)
  for (const child of node.children) ids(child, out)
  return out
}

function validate(root: PlanNode) {
  const all = ids(root)

  let count = 0
  function countAll(n: PlanNode) {
    count++
    for (const child of n.children) countAll(child)
  }
  countAll(root)
  if (count !== all.size) throw new Error("Duplicate node IDs detected in plan")

  function checkParents(n: PlanNode, isRoot: boolean) {
    if (!isRoot && n.parentId !== null && !all.has(n.parentId))
      throw new Error(`Node ${n.id} has missing parentId ${n.parentId}`)
    for (const child of n.children) checkParents(child, false)
  }
  checkParents(root, true)

  function normalize(n: PlanNode) {
    n.children.forEach((child, i) => {
      child.order = i + 1
      normalize(child)
    })
  }
  normalize(root)
}

async function readJson(p: string): Promise<PlanNode> {
  const text = await readFile(p, "utf-8")
  return JSON.parse(text) as PlanNode
}

export async function readCurrentPlan(): Promise<string | null> {
  try {
    const text = await readFile(currentPlanPath(), "utf-8")
    return text.trim() || null
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null
    throw e
  }
}

export async function writeCurrentPlan(name: string) {
  await atomicWriteText(currentPlanPath(), name)
}

export async function loadPlan(name: string): Promise<PlanNode> {
  const root = await readJson(planPath(name))
  validate(root)
  return root
}

export async function savePlan(name: string, root: PlanNode) {
  validate(root)
  await atomicWriteJson(planPath(name), root)
}

export async function loadBranch(name: string, branch: string): Promise<PlanNode> {
  const root = await readJson(branchPath(name, branch))
  validate(root)
  return root
}

export async function saveBranch(name: string, branch: string, root: PlanNode) {
  validate(root)
  await atomicWriteJson(branchPath(name, branch), root)
}
