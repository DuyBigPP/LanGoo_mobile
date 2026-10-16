import React from "react";
import { MoreHorizontal } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/reusables/dropdown-menu";
import { Text } from "@/components/reusables/text";
import { useTheme } from "@/theme";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Nút "⋯" mở menu thả xuống tại chỗ (DropdownMenu của React Native Reusables, như web).
 * Lưu ý: menu render qua PortalHost nên KHÔNG dùng bên trong BottomSheet/Modal gốc (sẽ bị che).
 */
export function ActionMenu({ items, accessibilityLabel, testID }: ActionMenuProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        hitSlop={8}
        className="size-9 items-center justify-center rounded-lg active:bg-accent"
      >
        <MoreHorizontal size={18} color={theme.colors.textMuted} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        insets={{ top: insets.top, bottom: insets.bottom, left: 12, right: 12 }}
        className="min-w-[200px]"
      >
        {items.map(item => (
          <DropdownMenuItem
            key={item.label}
            variant={item.destructive ? "destructive" : "default"}
            onPress={item.onPress}
            className="min-h-11 gap-3"
          >
            {item.icon}
            <Text>{item.label}</Text>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
