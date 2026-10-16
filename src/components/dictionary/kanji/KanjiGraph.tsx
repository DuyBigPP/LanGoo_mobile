import * as React from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import type { KanjiComponentDto } from "@/types/dictionary";

interface GraphNode {
  id: string;
  char: string;
  kind: "root" | "component" | "radical";
  x: number;
  y: number;
  radius: number;
}

/** Hệ toạ độ gốc như web (640 ngang); co giãn vừa bề ngang màn hình. */
const VIEW_WIDTH = 640;
const MARGIN = 70;
const DEPTH_STEP = 140;
/** Màu viền node bộ thủ (cam như web). */
const RADICAL_STROKE = "#f59e0b";

function countLeaves(components: KanjiComponentDto[]): number {
  let count = 0;
  for (const component of components) {
    count += component.children.length === 0 ? 1 : countLeaves(component.children);
  }
  return count;
}

/** Dàn cây thành phần lên khung: lá xếp ngang, cha nằm giữa các con (port web `layoutGraph`). */
function layoutGraph(literal: string, components: KanjiComponentDto[], radical: string | null) {
  const nodes: GraphNode[] = [];
  const edges: { from: string; to: string }[] = [];
  const slot = (VIEW_WIDTH - MARGIN * 2) / Math.max(1, countLeaves(components));
  let leafIndex = 0;

  const place = (component: KanjiComponentDto, depth: number): GraphNode => {
    const childNodes = component.children.map(child => place(child, depth + 1));
    let x: number;
    if (childNodes.length > 0) {
      x = childNodes.reduce((sum, node) => sum + node.x, 0) / childNodes.length;
    } else {
      x = MARGIN + (leafIndex + 0.5) * slot;
      leafIndex += 1;
    }
    const node: GraphNode = {
      id: `${depth}-${component.char}-${nodes.length}`,
      char: component.char,
      kind: "component",
      x,
      y: 150 + depth * DEPTH_STEP,
      radius: 34,
    };
    nodes.push(node);
    for (const childNode of childNodes) edges.push({ from: node.id, to: childNode.id });
    return node;
  };

  const top = components.map(component => place(component, 0));
  const rootX = top.length > 0 ? top.reduce((sum, node) => sum + node.x, 0) / top.length : VIEW_WIDTH / 2;
  nodes.push({ id: "root", char: literal, kind: "root", x: rootX, y: 60, radius: 46 });
  for (const node of top) edges.push({ from: "root", to: node.id });

  // Bộ thủ (nếu khác chữ gốc và chưa có trong cây) — node riêng bên cạnh
  if (radical && radical !== literal && !nodes.some(node => node.char === radical)) {
    nodes.push({ id: "radical", char: radical, kind: "radical", x: VIEW_WIDTH - 60, y: 60, radius: 34 });
    edges.push({ from: "root", to: "radical" });
  }

  const viewHeight = Math.max(...nodes.map(node => node.y + node.radius)) + 30;
  return { nodes, edges, viewHeight };
}

export interface KanjiGraphProps {
  literal: string;
  components: KanjiComponentDto[];
  radical: string | null;
  /** Chạm một node (không phải chữ gốc) -> mở chi tiết chữ đó. */
  onOpenKanji: (char: string) => void;
}

/** Đồ thị phân tích chữ Hán (kiểu Mazii): chữ gốc → thành phần → thành phần con (+ bộ thủ). */
export function KanjiGraph({ literal, components, radical, onOpenKanji }: KanjiGraphProps) {
  const t = useT();
  const theme = useTheme();
  const [width, setWidth] = React.useState(0);
  const graph = React.useMemo(
    () => layoutGraph(literal, components, radical),
    [literal, components, radical],
  );
  const nodeById = React.useMemo(() => new Map(graph.nodes.map(node => [node.id, node])), [graph]);

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const height = width > 0 ? (width * graph.viewHeight) / VIEW_WIDTH : 0;

  return (
    <View
      onLayout={handleLayout}
      className="min-h-[120px] overflow-hidden rounded-lg border border-border bg-card"
      accessibilityLabel={t("dict.graphTitle", { literal })}
      testID="kanji-graph"
    >
      {width > 0 ? (
        <Svg width={width} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${graph.viewHeight}`}>
          {graph.edges.map(edge => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;
            return (
              <G key={`${edge.from}-${edge.to}`}>
                <Line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={theme.colors.border}
                  strokeWidth={2}
                />
                <Circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r={4} fill={theme.colors.textMuted} />
              </G>
            );
          })}

          {graph.nodes.map(node => {
            const isRoot = node.kind === "root";
            const isRadical = node.kind === "radical";
            const fontSize = isRoot ? 44 : 32;
            return (
              <G
                key={node.id}
                onPress={isRoot ? undefined : () => onOpenKanji(node.char)}
                testID={`graph-node-${node.kind}-${node.char}`}
              >
                <Circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={isRoot ? theme.colors.primarySoft : theme.colors.background}
                  stroke={isRadical ? RADICAL_STROKE : isRoot ? theme.colors.primary : theme.colors.border}
                  strokeWidth={isRoot ? 3 : 2}
                />
                {/* Android không hỗ trợ dominantBaseline ổn định -> dời xuống ~0.35 cỡ chữ để căn giữa */}
                <SvgText
                  x={node.x}
                  y={node.y + fontSize * 0.35}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fontWeight="600"
                  fill={theme.colors.text}
                >
                  {node.char}
                </SvgText>
                {isRadical ? (
                  <SvgText
                    x={node.x}
                    y={node.y + node.radius + 20}
                    textAnchor="middle"
                    fontSize={16}
                    fill={RADICAL_STROKE}
                  >
                    {t("dict.graphRadical")}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
