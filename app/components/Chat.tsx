"use client";
// 화면 ③ 대화 영역과 ④ 질문 입력줄 (DESIGN 2장) — 브라우저에서 동작
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  MAX_HISTORY,
  MAX_QUESTION_LENGTH,
  type AnswerItem,
  type AskRequest,
  type AskResponse,
  type AskTurn,
} from "@/lib/ask/types";
import { RETRY_TEXT } from "@/lib/messages";

const EXAMPLES = ["오늘 일정 알려줘", "이번 주 일정 알려줘", "다음 주 일정 알려줘"];

type Message =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      answer: string;
      items: AnswerItem[];
      /** 10건을 넘어 기본으로는 숨겨 둔 나머지 일정 */
      more: AnswerItem[];
      /** 나머지까지 모두 보여줄 때 쓰는 답변 문장 */
      expandedAnswer?: string;
      /** "나머지 더 보기"를 눌러 모두 펼쳤는지 */
      expanded: boolean;
    };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 생기면 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const body: AskRequest = { question: trimmed, history: recentTurns(messages) };
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    let reply: Message;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AskResponse = await res.json();
      reply = {
        role: "assistant",
        answer: data.answer,
        items: data.items,
        more: data.moreItems ?? [],
        expandedAnswer: data.expandedAnswer,
        expanded: false,
      };
    } catch {
      reply = { role: "assistant", answer: RETRY_TEXT, items: [], more: [], expanded: false };
    }
    setMessages((prev) => [...prev, reply]);
    setLoading(false);
  }

  /** 10건을 넘어 숨겨 둔 나머지를 펼친다 */
  function expand(index: number) {
    setMessages((prev) =>
      prev.map((message, i) =>
        i === index && message.role === "assistant" ? { ...message, expanded: true } : message,
      ),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(input);
  }

  return (
    <section aria-label="일정 질문" className="flex flex-1 flex-col gap-4">
      <ol className="flex flex-1 flex-col gap-3" aria-live="polite">
        {messages.length === 0 && (
          <li className="py-8 text-center text-sm text-zinc-500">
            궁금한 일정을 평소 말투로 물어보세요.
          </li>
        )}
        {messages.map((message, i) =>
          message.role === "user" ? (
            <li
              key={i}
              className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {message.text}
            </li>
          ) : (
            <li
              key={i}
              className="flex max-w-full flex-col gap-2 self-start rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p>{message.expanded ? (message.expandedAnswer ?? message.answer) : message.answer}</p>
              {message.items.length > 0 && <ItemList items={visibleItems(message)} />}
              {message.more.length > 0 && !message.expanded && (
                <button
                  type="button"
                  onClick={() => expand(i)}
                  className="self-start rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  나머지 {message.more.length}건 더 보기
                </button>
              )}
            </li>
          ),
        )}
        {loading && (
          <li className="self-start px-1 text-sm text-zinc-500">
            답변을 만드는 중…
          </li>
        )}
      </ol>
      <div ref={bottomRef} />

      <div className="sticky bottom-0 flex flex-col gap-2 bg-background pb-4 pt-2">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="예: 다음 주 기획관리팀 일정 알려줘"
            aria-label="질문"
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            질문
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={loading}
              onClick={() => ask(example)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 지금 화면에 보이는 일정. 기본은 최대 10건이고, 나머지 더 보기를 누르면 전부다. */
function visibleItems(message: Extract<Message, { role: "assistant" }>): AnswerItem[] {
  return message.expanded ? [...message.items, ...message.more] : message.items;
}

/** 일정 목록 한 줄 = 날짜 · 일정명 · 시간 · 대상자 · 장소 */
function ItemList({ items }: { items: AnswerItem[] }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {items.map((item, i) => (
        <li key={i} className="flex flex-wrap gap-x-2">
          <span className="font-medium tabular-nums">{item.date}</span>
          <span className="font-medium">{item.title}</span>
          <span className="text-zinc-600 dark:text-zinc-400">
            {item.time} · {item.target} · {item.place}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 지금까지의 대화에서 최근 질문·답변 쌍을 뽑는다 */
function recentTurns(messages: Message[]): AskTurn[] {
  const turns: AskTurn[] = [];
  for (let i = 0; i + 1 < messages.length; i++) {
    const q = messages[i];
    const a = messages[i + 1];
    if (q.role === "user" && a.role === "assistant") {
      // "그중 본부장만" 같은 질문을 위해 화면에 보이는 일정도 함께 적어 보낸다
      const lines = visibleItems(a).map((item) => `- ${item.date} ${item.title}`);
      const answer = a.expanded ? (a.expandedAnswer ?? a.answer) : a.answer;
      turns.push({ question: q.text, answer: [answer, ...lines].join("\n") });
    }
  }
  return turns.slice(-MAX_HISTORY);
}
