import { Platform, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type NativeOnlyAnimatedViewProps =
  | (React.ComponentProps<typeof Animated.View> & { as?: "View" })
  | (React.ComponentProps<typeof AnimatedPressable> & { as: "Pressable" });

/**
 * This component is used to wrap animated views that should only be animated on native.
 * @param props - The props for the animated view.
 * @returns The animated view if the platform is native, otherwise the children.
 * @example
 * <NativeOnlyAnimatedView entering={FadeIn} exiting={FadeOut}>
 *   <Text>I am only animated on native</Text>
 * </NativeOnlyAnimatedView>
 */
function NativeOnlyAnimatedView(props: NativeOnlyAnimatedViewProps) {
  if (Platform.OS === 'web') {
    return <>{props.children as React.ReactNode}</>;
  } else {
    if (props.as === "Pressable") {
      // `key` bị loại khỏi props: reanimated 3 khai báo `key?: Key | SharedValue<Key>`,
      // không khớp với `key` của JSX (reanimated 4 không còn map kiểu này).
      const pressableProps = props as Omit<
        React.ComponentProps<typeof AnimatedPressable>,
        "key"
      >;
      return <AnimatedPressable {...pressableProps} />;
    }
    return <Animated.View {...props} />;
  }
}

export { NativeOnlyAnimatedView };
