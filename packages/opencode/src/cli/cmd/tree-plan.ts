import type { Argv } from "yargs"
import { cmd } from "./cmd"
import { save, load, exists, renderMarkdown } from "../lib/tree-plan/store"
import { createRoot, addChild } from "../lib/tree-plan/node"
import type { PlanNode, TaskType, TaskStatus } from "../lib/tree-plan/node"

export const TreePlanCommand = cmd({
  command: "tree-plan",
  describe: "manage hierarchical task plans",
  builder: (yargs: Argv) => yargs.command(InitCmd).command(AddCmd).command(ShowCmd).demandCommand(),
  async handler() {},
})

const InitCmd = cmd({
  command: "init <name>",
  describe: "create a new plan",
  builder: (yargs: Argv) =>
    yargs.positional("name", {
      describe: "plan name",
      type: "string",
      demandOption: true,
    }),
  handler: async (args) => {
    const name = args.name
    if (exists(name)) throw new Error(`Plan '${name}' already exists`)
    const root = createRoot(name)
    await save(name, root)
    console.log(`Created plan '${name}'`)
  },
})

const AddCmd = cmd({
  command: "add <name> <task>",
  describe: "add a task to a plan",
  builder: (yargs: Argv) =>
    yargs
      .positional("name", {
        describe: "plan name",
        type: "string",
        demandOption: true,
      })
      .positional("task", {
        describe: "task description",
        type: "string",
        demandOption: true,
      })
      .option("type", {
        describe: "task type",
        type: "string",
        choices: ["analysis", "design", "code", "test", "ops"] as const,
        default: "code",
      })
      .option("status", {
        describe: "task status",
        type: "string",
        choices: ["todo", "in_progress", "blocked", "needs_review", "done"] as const,
        default: "todo",
      })
      .option("depends-on", {
        describe: "task IDs this task depends on",
        type: "string",
        array: true,
      })
      .option("action-hint", {
        describe: "hint for task executor",
        type: "string",
      })
      .option("resource", {
        describe: "resource identifier",
        type: "string",
        array: true,
      })
      .option("parent-id", {
        describe: "parent node ID (default: root)",
        type: "string",
      }),
  handler: async (args) => {
    const name = args.name
    const root = await load(name)

    const parent = args.parentId ? findNode(root, args.parentId) : root
    if (!parent) throw new Error(`Node with id '${args.parentId}' not found in plan '${name}'`)

    const child = addChild(parent, args.task)
    child.type = args.type as TaskType
    child.status = args.status as TaskStatus
    if (args.dependsOn) child.depends_on = args.dependsOn
    if (args.actionHint) child.metadata.action_hint = args.actionHint
    if (args.resource) child.metadata.resources = args.resource

    await save(name, root)
    console.log(`Added task '${args.task}' to plan '${name}'`)
  },
})

const ShowCmd = cmd({
  command: "show <name>",
  describe: "print a plan to stdout",
  builder: (yargs: Argv) =>
    yargs.positional("name", {
      describe: "plan name",
      type: "string",
      demandOption: true,
    }),
  handler: async (args) => {
    const root = await load(args.name)
    console.log(renderMarkdown(root))
  },
})

function findNode(node: PlanNode, id: string): PlanNode | undefined {
  if (node.id === id) return node
  for (const child of node.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return undefined
}
