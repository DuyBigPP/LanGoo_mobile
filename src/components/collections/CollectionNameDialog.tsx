import React from "react";
import { AppText, Dialog, Input } from "@/components/ui";
import { useT } from "@/i18n";

export interface CollectionNameDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  testID: string;
  inputTestID: string;
}

/** Hộp thoại nhập tên sổ tay — dùng chung cho Tạo mới và Đổi tên (tên ≤ 80 ký tự theo API). */
export function CollectionNameDialog({
  visible,
  title,
  description,
  confirmLabel,
  value,
  onChange,
  onConfirm,
  onClose,
  testID,
  inputTestID,
}: CollectionNameDialogProps) {
  const t = useT();
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={title}
      testID={testID}
      actions={[
        { label: t("common.cancel"), variant: "outline", onPress: onClose },
        { label: confirmLabel, variant: "primary", onPress: onConfirm },
      ]}
    >
      <AppText variant="caption">{description}</AppText>
      <Input
        label={t("study.formName")}
        value={value}
        onChangeText={onChange}
        placeholder={t("study.formNamePlaceholder")}
        maxLength={80}
        testID={inputTestID}
      />
    </Dialog>
  );
}
