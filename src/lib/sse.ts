/**
 * SSE client cho React Native (thuần XMLHttpRequest).
 *
 * RN không có `EventSource` và `fetch` không đọc được stream — XHR với
 * `readyState === 3` (LOADING) trả `responseText` tích luỹ dần nên ta tự
 * tách block SSE (giữa 2 dòng trống) để phát event.
 */

export interface SseRawEvent {
  name: string;
  data: string;
}

export interface SseHandle {
  abort: () => void;
}

interface SseOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  onEvent: (event: SseRawEvent) => void;
  /** Kết thúc request (kể cả HTTP lỗi) — status + body để tầng gọi xử lý */
  onFinish: (result: { status: number; body: string }) => void;
  onNetworkError: (error: Error) => void;
}

function parseBlock(block: string): SseRawEvent | null {
  let name = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith(":")) continue; // comment giữ nhịp ": ping"
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  return { name, data: dataLines.join("\n") };
}

export function sseRequest(options: SseOptions): SseHandle {
  const xhr = new XMLHttpRequest();
  let cursor = 0;
  let buffer = "";

  xhr.open(options.method ?? "POST", options.url);
  xhr.setRequestHeader("Accept", "text/event-stream");
  if (options.body) xhr.setRequestHeader("Content-Type", "application/json");
  Object.entries(options.headers ?? {}).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value);
  });

  const drain = () => {
    const text = xhr.responseText ?? "";
    if (text.length <= cursor) return;
    buffer += text.slice(cursor);
    cursor = text.length;
    let index = buffer.indexOf("\n\n");
    while (index >= 0) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const event = parseBlock(block);
      if (event) options.onEvent(event);
      index = buffer.indexOf("\n\n");
    }
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 3) drain();
    if (xhr.readyState === 4) {
      drain();
      options.onFinish({ status: xhr.status, body: xhr.responseText ?? "" });
    }
  };
  xhr.onerror = () => options.onNetworkError(new Error("NETWORK_ERROR"));
  xhr.ontimeout = () => options.onNetworkError(new Error("TIMEOUT"));

  xhr.send(options.body);

  return {
    abort: () => {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    },
  };
}
