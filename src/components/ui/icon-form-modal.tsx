"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import { message } from "./message";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; url: string }) => void;
  initialData?: { name: string; url: string };
  mode?: "add" | "edit";
};

function normalizeUrl(raw: string) {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return !!u.hostname && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export function IconFormModal({ open, onClose, onSubmit, initialData, mode = "add" }: Props) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [url, setUrl] = useState(initialData?.url ?? "");
  const [nameError, setNameError] = useState("");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setUrl(initialData?.url ?? "");
      setNameError("");
      setUrlError("");
    }
  }, [open, initialData?.name, initialData?.url]);

  const handleSubmit = () => {
    let ok = true;
    const n = name.trim();
    const uRaw = url.trim();
    if (!n) {
      setNameError("请输入名称");
      ok = false;
    } else if (n.length > 20) {
      setNameError("名称不超过 20 字符");
      ok = false;
    } else setNameError("");

    if (!uRaw) {
      setUrlError("请输入链接地址");
      ok = false;
    } else {
      const norm = normalizeUrl(uRaw);
      if (!isValidUrl(norm)) {
        setUrlError("请输入合法链接，如 https://example.com");
        ok = false;
      } else setUrlError("");
    }

    if (!ok) return;
    const norm = normalizeUrl(uRaw);
    onSubmit({ name: n, url: norm });
    message.success(mode === "add" ? "已添加" : "已保存");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "添加图标" : "编辑图标"}
      width={420}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {mode === "add" ? "添加" : "保存"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            名称
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
            placeholder="如 GitHub"
            maxLength={20}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white dark:focus:ring-white/10"
          />
          {nameError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{nameError}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            链接地址
          </label>
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (urlError) setUrlError("");
            }}
            placeholder="https://example.com"
            inputMode="url"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white dark:focus:ring-white/10"
          />
          {urlError ? (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{urlError}</p>
          ) : (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">支持输入域名自动补全 https://</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
