import type { NavigatorScreenParams } from "@react-navigation/native";

/** Tab chính */
export type MainTabParamList = {
  Dictionary: { q?: string } | undefined;
  Translate: undefined;
  Collections: undefined;
  /** `ask`/`sense`: mở chat kèm câu hỏi sẵn (nút "Hỏi AI" ở chi tiết nghĩa — giống web `/chat?ask=…&sense=…`) */
  Chat: { ask?: string; sense?: string } | undefined;
  Profile: undefined;
};

/** Stack gốc (auth → onboarding → tabs + các màn đẩy lên) */
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<MainTabParamList>;

  SenseDetail: { lexemeId?: string; senseId?: string; surface?: string };
  KanjiDetail: { literal: string };

  CollectionDetail: { collectionId: string; name: string };
  EditItem: { collectionId: string; itemId: string };
  Flashcard: { collectionId?: string; limit?: number };
  QuizSession: { sessionId: string };

  ProfileForm: { profileId?: string };
  Sources: undefined;
  Feedback: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
