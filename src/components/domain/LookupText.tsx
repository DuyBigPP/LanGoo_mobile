import * as React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

export interface LookupTextProps {
  text: string;
  /** Gọi khi người dùng nhấn giữ một ký tự (index theo code point trong `text`). */
  onLookup: (char: string, index: number) => void;
  style?: StyleProp<TextStyle>;
}

/**
 * Câu tiếng Nhật render theo TỪNG KÝ TỰ — mỗi ký tự bắt long-press để mở phiếu tra nhanh.
 *
 * Vì sao long-press từng ký tự (khác web): web bắt được sự kiện selectionchange nên
 * biết chính xác đoạn người dùng bôi đen; React Native không có API tương đương cho
 * Text (chỉ có `selectable` hiện menu hệ thống, không đọc được range đã chọn).
 * Nên trên mobile dùng cách "nhấn giữ vào chữ muốn tra": tách câu thành các <Text>
 * con riêng để biết chính xác ký tự nào bị giữ.
 *
 * Không dùng AppText ở đây để câu chữ kế thừa style/màu của <Text> cha (nhờ vậy vẫn
 * giữ được highlight đỏ của đoạn target khi lồng vào nhau).
 */
export function LookupText({ text, onLookup, style }: LookupTextProps) {
  return (
    <Text style={style} selectable>
      {Array.from(text).map((char, index) => {
        // Khoảng trắng/xuống dòng: giữ nguyên, không gắn sự kiện (tra cũng vô nghĩa)
        if (/\s/.test(char)) {
          return <Text key={index}>{char}</Text>;
        }
        return (
          <Text
            key={index}
            testID={`lookup-char-${index}`}
            suppressHighlighting
            onLongPress={() => onLookup(char, index)}
          >
            {char}
          </Text>
        );
      })}
    </Text>
  );
}
