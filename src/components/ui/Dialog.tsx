import React from "react";
import { BackHandler, View } from "react-native";
import {
  Dialog as ReusablesDialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/reusables/dialog";
import { Button } from "./Button";

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
}

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: DialogAction[];
  testID?: string;
}

/**
 * Hộp thoại giữa màn hình — lõi là Dialog của React Native Reusables (render qua PortalHost ở App.tsx).
 * Chạm nền tối / nút X để đóng; nút Back của Android cũng đóng (Dialog Reusables không phải Modal gốc).
 */
export function Dialog({ visible, onClose, title, children, actions, testID }: DialogProps) {
  React.useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  return (
    <ReusablesDialog open={visible} onOpenChange={open => (open ? undefined : onClose())}>
      <DialogContent testID={testID} className="w-[90%] max-w-[420px] gap-2 rounded-2xl bg-card-elevated p-4">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-left text-base leading-snug">{title ?? ""}</DialogTitle>
        </DialogHeader>
        <View className="gap-1">{children}</View>
        {actions && actions.length > 0 ? (
          <DialogFooter className="mt-2 flex-row flex-wrap justify-end gap-2">
            {actions.map(action => (
              <Button
                key={action.label}
                label={action.label}
                variant={action.variant ?? "primary"}
                onPress={action.onPress}
              />
            ))}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </ReusablesDialog>
  );
}
