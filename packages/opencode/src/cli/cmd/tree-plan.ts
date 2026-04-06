import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { UI } from "../ui"
import * as prompts from "@clack/prompts"
import { createRoot } from "../lib/tree-plan/node"
import { atomicWriteText, baseDir, planPath, branchPath, exportPath } from "../lib/tree-plan/paths"
import { loadPlan, savePlan, loadBranch, saveBranch, readCurrentPlan, writeCurrentPlan } from "../lib/tree-plan/storage"
import { render } from "../lib/tree-plan/markdown"
import { selectNode } from "../lib/tree-plan/select"
import { findNode, addChild } from "../lib/tree-plan/node"

async function resolvePlan(name?: string): Promise<string> {
  if (name) return name
  const cur = await readCurrentPlan()
  if (cur) return cur
  UI.error("No plan specified and no current plan set. Use --name or run init first.")
  process.exit(1)
}

const InitCommand = cmd({
  command: "init",
  describe: "create a new plan",
  builder: (yargs: Argv) =>
    yargs
      .option("name", { type: "string", describe: "plan name" })
      .option("title", { type: "string", describe: "root node title" })
      .option("yes", { type: "boolean", default: false, describe: "skip prompts" }),
  handler: async (args) => {
    let name = args.name as string | undefined
    let title = args.title as string | undefined
    const yes = args.yes as boolean

    if (yes && (!name || !title)) {
      UI.error("--name and --title are required when --yes is provided")
      process.exit(1)
    }

    if (!name) {
      const input = await prompts.text({ message: "Plan name:", output: process.stderr })
      if (prompts.isCancel(input)) throw new UI.CancelledError()
      name = input as string
    }

    if (!title) {
      const input = await prompts.text({ message: "Root title:", output: process.stderr })
      if (prompts.isCancel(input)) throw new UI.CancelledError()
      title = input as string
    }

    const root = createRoot(title)
    await savePlan(name, root)
    await writeCurrentPlan(name)
    process.stdout.write(`Created plan "${name}" at ${planPath(name)}\n`)
  },
})

const PathCommand = cmd({
  command: "path",
  describe: "print base path (or plan/branch/export paths)",
  builder: (yargs: Argv) => yargs.option("name", { type: "string", describe: "plan name" }),
  handler: async (args) => {
    const name = args.name as string | undefined
    if (!name) {
      process.stdout.write(baseDir() + "\n")
      return
    }
    process.stdout.write(`plan: ${planPath(name)}\n`)
    process.stdout.write(`export: ${exportPath(name)}\n`)
  },
})

const ShowCommand = cmd({
  command: "show",
  describe: "print plan as markdown",
  builder: (yargs: Argv) =>
    yargs
      .option("name", { type: "string", describe: "plan name" })
      .option("full", { type: "boolean", default: false, describe: "show full UUIDs" }),
  handler: async (args) => {
    const name = await resolvePlan(args.name as string | undefined)
    const root = await loadPlan(name)
    process.stdout.write(render(root, args.full as boolean) + "\n")
  },
})

const TreePlanExportCommand = cmd({
  command: "export",
  describe: "export plan to markdown file",
  builder: (yargs: Argv) =>
    yargs
      .option("name", { type: "string", describe: "plan name" })
      .option("yes", { type: "boolean", default: false, describe: "skip overwrite confirmation" }),
  handler: async (args) => {
    const name = await resolvePlan(args.name as string | undefined)
    const root = await loadPlan(name)
    const dest = exportPath(name)
    const yes = args.yes as boolean
    const exists = await Bun.file(dest).exists()

    if (exists && !yes) {
      const ok = await prompts.confirm({
        message: `${dest} already exists. Overwrite?`,
        output: process.stderr,
      })
      if (!ok || prompts.isCancel(ok)) {
        prompts.outro("Cancelled", { output: process.stderr })
        return
      }
    }

    const md = render(root, false)
    await atomicWriteText(dest, md)
    process.stdout.write(`Exported to ${dest}\n`)
  },
})

const AddCommand = cmd({
  command: "add",
  describe: "add a child node",
  builder: (yargs: Argv) =>
    yargs
      .option("name", { type: "string", describe: "plan name" })
      .option("parent", { type: "string", describe: "parent node ID" })
      .option("title", { type: "string", describe: "node title" })
      .option("yes", { type: "boolean", default: false, describe: "skip prompts" }),
  handler: async (args) => {
    const name = await resolvePlan(args.name as string | undefined)
    const yes = args.yes as boolean
    let pid = args.parent as string | undefined
    let title = args.title as string | undefined

    if (yes && (!pid || !title)) {
      UI.error("--parent and --title are required when --yes is provided")
      process.exit(1)
    }

    const root = await loadPlan(name)

    if (!pid) {
      const node = await selectNode(root, "Select parent node:")
      pid = node.id
    }

    if (!title) {
      const input = await prompts.text({ message: "Node title:", output: process.stderr })
      if (prompts.isCancel(input)) throw new UI.CancelledError()
      title = input as string
    }

    const parent = findNode(root, pid)
    if (!parent) {
      UI.error(`Node ${pid} not found`)
      process.exit(1)
    }

    addChild(parent, title)
    await savePlan(name, root)
    process.stdout.write(`Added child "${title}" to ${pid}\n`)
  },
})

const RenameCommand = cmd({
  command: "rename",
  describe: "rename a node",
  builder: (yargs: Argv) =>
    yargs
      .option("name", { type: "string", describe: "plan name" })
      .option("node", { type: "string", describe: "node ID" })
      .option("title", { type: "string", describe: "new title" })
      .option("yes", { type: "boolean", default: false, describe: "skip prompts" }),
  handler: async (args) => {
    const name = await resolvePlan(args.name as string | undefined)
    const yes = args.yes as boolean
    let nid = args.node as string | undefined
    let title = args.title as string | undefined

    if (yes && (!nid || !title)) {
      UI.error("--node and --title are required when --yes is provided")
      process.exit(1)
    }

    const root = await loadPlan(name)

    if (!nid) {
      const node = await selectNode(root, "Select node to rename:")
      nid = node.id
    }

    if (!title) {
      const input = await prompts.text({ message: "New title:", output: process.stderr })
      if (prompts.isCancel(input)) throw new UI.CancelledError()
      title = input as string
    }

    const node = findNode(root, nid)
    if (!node) {
      UI.error(`Node ${nid} not found`)
      process.exit(1)
    }

    node.title = title
    await savePlan(name, root)
    process.stdout.write(`Renamed node ${nid} to "${title}"\n`)
  },
})

const RemoveCommand = cmd({
  command: "remove",
  describe: "remove a node (recursive)",
  builder: (yargs: Argv) =>
    yargs
      .option("name", { type: "string", describe: "plan name" })
      .option("node", { type: "string", describe: "node ID" })
      .option("yes", { type: "boolean", default: false, describe: "skip confirmation" }),
  handler: async (args) => {
    const name = await resolvePlan(args.name as string | undefined)
    const yes = args.yes as boolean
    let nid = args.node as string | undefined

    const root = await loadPlan(name)

    if (!nid) {
      if (yes) {
        UI.error("--node is required when --yes is provided")
        process.exit(1)
      }
      const node = await selectNode(root, "Select node to remove:")
      nid = node.id
    }

    if (nid === root.id) {
      UI.error("Cannot remove root node")
      process.exit(1)
    }

    if (!yes) {
      const ok = await prompts.confirm({
        message: `Remove node ${nid} and all its children?`,
        output: process.stderr,
      })
      if (!ok || prompts.isCancel(ok)) {
        prompts.outro("Cancelled", { output: process.stderr })
        return
      }
    }

    function removeFrom(node: typeof root): boolean {
      const idx = node.children.findIndex((c) => c.id === nid)
      if (idx !== -1) {
        node.children.splice(idx, 1)
        node.children.forEach((c, i) => {
          c.order = i + 1
        })
        return true
      }
      return node.children.some((c) => removeFrom(c))
    }

    removeFrom(root)
    await savePlan(name, root)
    process.stdout.write(`Removed node ${nid}\n`)
  },
})

const ForkCommand = cmd({
  command: "fork",
  describe: "fork a subtree into a branch (UUID-preserving)",
  builder: (yargs: Argv) =>
    yargs
      .option("name", { type: "string", describe: "plan name" })
      .option("node", { type: "string", describe: "subtree root node ID" })
      .option("branch", { type: "string", describe: "branch name" })
      .option("yes", { type: "boolean", default: false, describe: "skip prompts" }),
  handler: async (args) => {
    const name = await resolvePlan(args.name as string | undefined)
    const yes = args.yes as boolean
    let nid = args.node as string | undefined
    let branch = args.branch as string | undefined

    if (yes && (!nid || !branch)) {
      UI.error("--node and --branch are required when --yes is provided")
      process.exit(1)
    }

    const root = await loadPlan(name)

    if (!nid) {
      const node = await selectNode(root, "Select subtree root:")
      nid = node.id
    }

    if (!branch) {
      const input = await prompts.text({ message: "Branch name:", output: process.stderr })
      if (prompts.isCancel(input)) throw new UI.CancelledError()
      branch = input as string
    }

    const sub = findNode(root, nid)
    if (!sub) {
      UI.error(`Node ${nid} not found`)
      process.exit(1)
    }

    function deepCopy(node: typeof root): typeof root {
      return {
        ...node,
        branchId: branch!,
        children: node.children.map(deepCopy),
      }
    }

    const copy = deepCopy(sub)
    await saveBranch(name, branch, copy)
    process.stdout.write(`Forked subtree ${nid} to branch "${branch}" at ${branchPath(name, branch)}\n`)
  },
})

const MergeCommand = cmd({
  command: "merge",
  describe: "merge a branch into the plan",
  builder: (yargs: Argv) =>
    yargs
      .option("name", { type: "string", describe: "plan name" })
      .option("branch", { type: "string", describe: "branch name" })
      .option("prefer", { type: "string", choices: ["source", "target"], describe: "auto-resolve conflicts" })
      .option("yes", { type: "boolean", default: false, describe: "skip prompts" }),
  handler: async (args) => {
    const name = await resolvePlan(args.name as string | undefined)
    const yes = args.yes as boolean
    let branch = args.branch as string | undefined
    const prefer = args.prefer as "source" | "target" | undefined

    if (yes && !branch) {
      UI.error("--branch is required when --yes is provided")
      process.exit(1)
    }

    if (!branch) {
      const input = await prompts.text({ message: "Branch name:", output: process.stderr })
      if (prompts.isCancel(input)) throw new UI.CancelledError()
      branch = input as string
    }

    const target = await loadPlan(name)
    const source = await loadBranch(name, branch)

    type N = typeof target

    async function mergeInto(root: N, src: N): Promise<N | null> {
      if (root.id === src.id) {
        return mergeNodes(root, src)
      }
      const merged: N = { ...root, children: [] }
      let found = false
      for (const child of root.children) {
        const next = await mergeInto(child, src)
        if (!next) {
          merged.children.push(child)
          continue
        }
        found = true
        merged.children.push(next)
      }
      if (!found) return null
      return merged
    }

    async function mergeNodes(t: N, s: N): Promise<N> {
      let title = t.title
      if (t.title !== s.title) {
        if (prefer === "source") title = s.title
        else if (prefer === "target") title = t.title
        else {
          const choice = await prompts.select({
            message: `Conflict on node ${t.id}: "${t.title}" vs "${s.title}". Keep:`,
            options: [
              { label: `target: "${t.title}"`, value: "target" },
              { label: `source: "${s.title}"`, value: "source" },
            ],
            output: process.stderr,
          })
          if (prompts.isCancel(choice)) throw new UI.CancelledError()
          title = choice === "source" ? s.title : t.title
        }
      }

      const merged: N = { ...t, title, children: [...t.children] }

      for (const sc of s.children) {
        const tc = merged.children.find((c) => c.id === sc.id)
        if (tc) {
          const idx = merged.children.indexOf(tc)
          merged.children[idx] = await mergeNodes(tc, sc)
        } else {
          merged.children.push({ ...sc })
        }
      }

      merged.children.forEach((c, i) => {
        c.order = i + 1
      })
      return merged
    }

    const merged = await mergeInto(target, source)
    if (!merged) {
      UI.error(`Node ${source.id} not found in plan "${name}"`)
      process.exit(1)
    }
    await savePlan(name, merged)
    process.stdout.write(`Merged branch "${branch}" into plan "${name}"\n`)
  },
})

export const TreePlanCommand = cmd({
  command: "tree-plan",
  describe: "manage plan trees",
  builder: (yargs: Argv) =>
    yargs
      .command(InitCommand)
      .command(PathCommand)
      .command(ShowCommand)
      .command(TreePlanExportCommand as any)
      .command(AddCommand)
      .command(RenameCommand)
      .command(RemoveCommand)
      .command(ForkCommand)
      .command(MergeCommand)
      .demandCommand(),
  handler: async () => {},
})
