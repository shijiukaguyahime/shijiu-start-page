"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import { message } from "./message";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { label: string; url: string; icon: string }) => void;
};

export function EngineFormModal({ open, onClose, onSubmit }: Props) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [labelError, setLabelError] = useState("");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLabel("");
    setUrl("");
    setIcon("");
    setLabelError("");
    setUrlError("");
  }, [open]);

  const handleSubmit = () => {
    let ok = true;
    if (!label.trim()) {
      setLabelError("请输入名称");
      ok = false;
    } else setLabelError("");

    if (!url.trim()) {
      setUrlError("请输入 URL");
      ok = false;
    } else if (!url.includes("{q}")) {
      setUrlError("URL 需包含 {q} 占位符");
      ok = false;
    } else setUrlError("");

    if (!ok) return;
    onSubmit({ label: label.trim(), url: url.trim(), icon: icon.trim() });
    message.success("已添加搜索引擎");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="添加自定义搜索引擎"
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
            添加
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">名称</label>
          <input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (labelError) setLabelError("");
            }}
            placeholder="如 MySearch"
            data-autofocus
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white dark:focus:ring-white/10"
          />
          {labelError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{labelError}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">URL</label>
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (urlError) setUrlError("");
            }}
            placeholder="https://example.com/search?q={q}"
            inputMode="url"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white dark:focus:ring-white/10"
          />
          {urlError ? (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{urlError}</p>
          ) : (
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">请用 {"{q}"} 作为关键词占位符</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">图标文字（可选）</label>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="默认取名称首字"
            maxLength={2}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-white dark:focus:ring-white/10"
          />
        </div>
      </div>
    </Modal>
  );
}
