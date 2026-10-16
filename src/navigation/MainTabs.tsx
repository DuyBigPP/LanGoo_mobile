import React from "react";
import { createBottomTabNavigator, useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { BookMarked, BookOpen, Bot, Languages, UserRound } from "lucide-react-native";
import { useToast } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useScopeReset } from "@/hooks/use-profile";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { ChatScreen } from "@/screens/chat/ChatScreen";
import { CollectionsScreen } from "@/screens/collections/CollectionsScreen";
import { DictionaryScreen } from "@/screens/dictionary/DictionaryScreen";
import { ProfileScreen } from "@/screens/profile/ProfileScreen";
import { TranslateScreen } from "@/screens/translate/TranslateScreen";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Tham số icon của tab — khớp kiểu `tabBarIcon` của react-navigation. */
type TabIconProps = { color: string; size: number };

const renderDictionaryIcon = ({ color, size }: TabIconProps) => <BookOpen color={color} size={size} />;
const renderTranslateIcon = ({ color, size }: TabIconProps) => <Languages color={color} size={size} />;
const renderCollectionsIcon = ({ color, size }: TabIconProps) => <BookMarked color={color} size={size} />;
const renderChatIcon = ({ color, size }: TabIconProps) => <Bot color={color} size={size} />;
const renderProfileIcon = ({ color, size }: TabIconProps) => <UserRound color={color} size={size} />;

/**
 * Đẩy toast lên trên tab bar: đọc chiều cao tab bar (phải nằm trong màn tab)
 * rồi báo cho ToastProvider; tab bị che (mở màn stack) thì trả offset về 0.
 */
function ToastOffsetSync() {
  const tabBarHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();
  const { setBottomOffset } = useToast();

  React.useEffect(() => {
    // Chỉ tab đang hiện mới ghi offset — tab khác bị che thì không đụng vào
    if (!isFocused) return;
    setBottomOffset(tabBarHeight);
    return () => setBottomOffset(0);
  }, [isFocused, tabBarHeight, setBottomOffset]);

  return null;
}

/** Layout bọc màn tab: kèm ToastOffsetSync để toast không đè lên tab bar. */
function TabScreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ToastOffsetSync />
      {children}
    </>
  );
}

/** Tab chính của app — mỗi tab là một khu vực chức năng. */
export function MainTabs() {
  const t = useT();
  const theme = useTheme();
  const { status } = useAuth();
  // MainTabs là một màn của stack gốc -> navigation này mở được modal Login
  const navigation = useNavigation();

  // Đổi hồ sơ hoạt động -> bỏ cache theo scope cũ (guest: không có hồ sơ nên không làm gì)
  useScopeReset();

  // Tab cần tài khoản (Sổ tay, Chat): guest bấm -> mở modal đăng nhập thay vì vào tab
  const requireAuthListeners = {
    tabPress: (event: { preventDefault: () => void }) => {
      if (status === "authenticated") return;
      event.preventDefault();
      navigation.navigate("Login");
    },
  };

  // Đăng xuất / hết phiên khi đang ở tab cần tài khoản: state điều hướng được giữ lại
  // khi stack dựng lại -> đẩy guest về Từ điển thay vì kẹt ở màn không có dữ liệu
  const kickGuestFromGatedTab = ({
    navigation: tabNavigation,
    route,
  }: {
    navigation: { navigate: (name: "Dictionary") => void };
    route: { name: string };
  }) => ({
    focus: () => {
      if (status !== "authenticated" && (route.name === "Collections" || route.name === "Chat")) {
        tabNavigation.navigate("Dictionary");
      }
    },
  });

  return (
    <Tab.Navigator
      screenListeners={kickGuestFromGatedTab}
      screenOptions={{
        headerShown: false,
        // Ẩn tab bar khi bàn phím mở (giống hành vi bản web)
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: "Be Vietnam Pro",
          // Web MobileTabBar: nhãn 10px / medium
          fontSize: 10,
          fontWeight: theme.fontWeight.medium,
        },
      }}
    >
      <Tab.Screen
        name="Dictionary"
        component={DictionaryScreen}
        layout={TabScreenLayout}
        options={{ title: t("nav.dictionary"), tabBarIcon: renderDictionaryIcon }}
      />
      <Tab.Screen
        name="Collections"
        component={CollectionsScreen}
        layout={TabScreenLayout}
        options={{ title: t("nav.collections"), tabBarIcon: renderCollectionsIcon }}
        listeners={requireAuthListeners}
      />
      <Tab.Screen
        name="Translate"
        component={TranslateScreen}
        layout={TabScreenLayout}
        options={{ title: t("nav.translate"), tabBarIcon: renderTranslateIcon }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        layout={TabScreenLayout}
        options={{ title: t("nav.chat"), tabBarIcon: renderChatIcon }}
        listeners={requireAuthListeners}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        layout={TabScreenLayout}
        options={{ title: t("nav.profile"), tabBarIcon: renderProfileIcon }}
      />
    </Tab.Navigator>
  );
}
