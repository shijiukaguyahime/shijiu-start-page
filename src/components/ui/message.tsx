"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";

type MessageType = "info" | "success" | "warning" | "error";
type MessageItem = {
  id: number;
  type: MessageType;
  content: string;
  duration: number;
};

let idCounter = 0;
let items: MessageItem[] = [];
type Listener = (next: MessageItem[]) => void;
let listeners: Listener[] = [];

function notify() {
  const snapshot = [...items];
  for (const l of listeners) l(snapshot);
}

function push(type: MessageType, content: string, duration = 2600) {
  const id = ++idCounter;
  const item: MessageItem = { id, type, content, duration };
  items = [...items, item];
  notify();
  if (duration > 0) {
    setTimeout(() => {
      items = items.filter((x) => x.id !== id);
      notify();
    }, duration);
  }
}

export const message = {
  info: (content: string, duration?: number) => push("info", content, duration),
  success: (content: string, duration?: number) => push("success", content, duration),
  warning: (content: string, duration?: number) => push("warning", content, duration),
  error: (content: string, duration?: number) => push("error", content, duration),
  open: (content: string, type: MessageType = "info", duration?: number) => push(type, content, duration),
};

export function MessageHost() {
  const [list, setList] = useState<MessageItem[]>(() => [...items]);
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const listener: Listener = (next) => setList(next);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  if (!mounted) return null;

  const node = (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-[18px] z-[80] flex flex-col items-center gap-2 px-4"
      style={{ transform: "translateZ(0)" }}
    >
      <AnimatePresence initial={false}>
        {list.map((m) => (
          <motion.div
            key={m.id}
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: -12, scale: 0.96, filter: "blur(6px)" }
            }
            animate={
              reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            }
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: -8, scale: 0.97, filter: "blur(4px)" }
            }
            transition={
              reduce
                ? ({ duration: 0.16 } as unknown as never)
                : ({
                    duration: 0.32,
                    ease: [0.22, 1, 0.36, 1],
                  } as unknown as never)
            }
            className="pointer-events-auto dropdown-panel gpu flex max-w-[min(92vw,520px)] items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium"
          >
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full"
              style={{
                background:
                  m.type === "success"
                    ? "#16a34a"
                    : m.type === "error"
                      ? "#ef4444"
                      : m.type === "warning"
                        ? "#f59e0b"
                        : "#18181b",
                color: "#fff",
              }}
              aria-hidden
            >
              {m.type === "success" ? (
                <CheckCircleIcon weight="bold" className="size-3.5" />
              ) : m.type === "error" ? (
                <XCircleIcon weight="bold" className="size-3.5" />
              ) : m.type === "warning" ? (
                <WarningCircleIcon weight="bold" className="size-3.5" />
              ) : (
                <InfoIcon weight="bold" className="size-3.5" />
              )}
            </span>
            <span className="min-w-0 break-words leading-tight text-zinc-800 dark:text-zinc-100">
              {m.content}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>

    </div>
  );

  return createPortal(node, document.body);
}
