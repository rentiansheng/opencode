import { useTheme } from "../context/theme"
import type { PlanNode } from "../../../lib/tree-plan/node"
import { For } from "solid-js"

export interface TreePlanItemProps {
  node: PlanNode
  depth: number
}

export function TreePlanItem(props: TreePlanItemProps) {
  const { theme } = useTheme()

  const icon = () => {
    switch (props.node.status) {
      case "in_progress":
        return "•"
      case "blocked":
        return "!"
      case "needs_review":
        return "?"
      case "done":
        return "✓"
      default:
        return " "
    }
  }

  const color = () => {
    switch (props.node.status) {
      case "in_progress":
        return theme.warning
      case "done":
        return theme.textMuted
      case "blocked":
        return theme.error
      default:
        return theme.text
    }
  }

  return (
    <box flexDirection="column">
      <box flexDirection="row" gap={0}>
        <text flexShrink={0} style={{ fg: color() }}>
          {"  ".repeat(props.depth)}[{icon()}] [{props.node.type}]{" "}
        </text>
        <text flexGrow={1} wrapMode="word" style={{ fg: color() }}>
          {props.node.task}
        </text>
      </box>
      <For each={props.node.children}>{(child) => <TreePlanItem node={child} depth={props.depth + 1} />}</For>
    </box>
  )
}
