import * as React from "react";
import { ApiError } from "@/api/client";
import {
  AppText,
  Dialog,
  Input,
  toastError,
  useToast,
  type DialogAction,
} from "@/components/ui";
import {
  useArchiveChatSessionMutation,
  useUpdateChatSessionMutation,
} from "@/hooks/use-chat";
import { useT } from "@/i18n";
import type { ChatSessionDto } from "@/types/api";
import { sessionTitle } from "./chat-helpers";

export interface SessionManageDialogProps {
  session: ChatSessionDto;
  onClose: () => void;
  onArchived: (id: string) => void;
}

/** Hộp thoại tuỳ chọn phiên: đổi tên hoặc lưu trữ (mở bằng nhấn giữ trong danh sách). */
export function SessionManageDialog({ session, onClose, onArchived }: SessionManageDialogProps) {
  const t = useT();
  const { show } = useToast();
  const [mode, setMode] = React.useState<"options" | "rename" | "archive">("options");
  const [name, setName] = React.useState(session.title ?? "");
  const updateSession = useUpdateChatSessionMutation(session.id);
  const archiveSession = useArchiveChatSessionMutation();
  const displayName = sessionTitle(session.title, t("chat.untitled"));

  // Mở phiên khác (hoặc tiêu đề đổi) -> về trạng thái ban đầu
  React.useEffect(() => {
    setName(session.title ?? "");
    setMode("options");
  }, [session.id, session.title]);

  const handleRename = async () => {
    try {
      await updateSession.mutateAsync({ title: name.trim() || undefined });
      show(t("chat.renamed"), { type: "success" });
      onClose();
    } catch (error) {
      toastError(ApiError.from(error).message);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveSession.mutateAsync(session.id);
      show(t("chat.archived"), { type: "success" });
      onArchived(session.id);
      onClose();
    } catch (error) {
      toastError(ApiError.from(error).message);
    }
  };

  const actions: DialogAction[] =
    mode === "options"
      ? [
          { label: t("chat.rename"), variant: "outline", onPress: () => setMode("rename") },
          { label: t("study.archive"), variant: "danger", onPress: () => setMode("archive") },
        ]
      : mode === "rename"
        ? [
            { label: t("common.cancel"), variant: "outline", onPress: () => setMode("options") },
            { label: t("common.save"), onPress: () => void handleRename() },
          ]
        : [
            { label: t("common.cancel"), variant: "outline", onPress: () => setMode("options") },
            { label: t("study.archive"), variant: "danger", onPress: () => void handleArchive() },
          ];

  return (
    <Dialog
      visible
      onClose={onClose}
      title={
        mode === "options"
          ? t("chat.sessionOptions")
          : mode === "rename"
            ? t("chat.renameTitle")
            : t("chat.archiveTitle", { name: displayName })
      }
      actions={actions}
      testID="chat-session-manage"
    >
      {mode === "options" ? (
        <AppText variant="caption">
          {`${displayName} · ${t("chat.messagesUnit", { count: session.message_count })}`}
        </AppText>
      ) : mode === "rename" ? (
        <Input
          value={name}
          onChangeText={setName}
          placeholder={t("chat.renamePlaceholder")}
          maxLength={80}
          testID="chat-rename-input"
        />
      ) : (
        <AppText variant="caption">{t("chat.archiveDesc")}</AppText>
      )}
    </Dialog>
  );
}
