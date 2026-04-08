import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createSignal, For, Show, onMount, onCleanup } from "solid-js"
import { TreePlanItem } from "../../component/tree-plan-item"
import { list, load } from "../../../../lib/tree-plan/store"
import type { PlanNode } from "../../../../lib/tree-plan/node"

const id = "internal:sidebar-tree-plan"

function PlanRoot(props: { root: PlanNode; api: TuiPluginApi }) {
  const [open, setOpen] = createSignal(true)
  const theme = () => props.api.theme.current

  return (
    <box flexDirection="column">
      <box flexDirection="row" gap={1} onMouseDown={() => setOpen((x) => !x)}>
        <text fg={theme().text}>{open() ? "▼" : "▶"}</text>
        <text fg={theme().text}>
          <b>{props.root.task}</b>
        </text>
      </box>
      <Show when={open()}>
        <box flexDirection="column">
          <For each={props.root.children}>{(child) => <TreePlanItem node={child} depth={0} />}</For>
        </box>
      </Show>
    </box>
  )
}

function View(props: { api: TuiPluginApi }) {
  const [roots, setRoots] = createSignal<PlanNode[]>([])

  const refresh = () => {
    const names = list()
    Promise.all(names.map((name: string) => load(name)))
      .then((data) => {
        setRoots(data)
      })
      .catch((_err) => {})
  }

  onMount(() => {
    refresh()
    const timer = setInterval(refresh, 2000)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <Show when={roots().length > 0}>
      <box flexDirection="column">
        <For each={roots()}>{(root) => <PlanRoot root={root} api={props.api} />}</For>
      </box>
    </Show>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 450,
    slots: {
      sidebar_content(_ctx, _props) {
        return <View api={api} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
