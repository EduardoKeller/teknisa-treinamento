"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export interface ComprovantePreview {
  url: string;
  tipo: "imagem" | "pdf";
}

export function ComprovanteModal({ preview, onClose }: { preview: ComprovantePreview | null; onClose: () => void }) {
  useEffect(() => {
    if (!preview) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preview, onClose]);

  if (!preview) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Comprovante</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
          {preview.tipo === "imagem" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="Comprovante" className="mx-auto max-w-full" />
          ) : (
            <iframe src={preview.url} title="Comprovante" className="h-[80vh] w-full" />
          )}
        </div>
        <div className="border-t border-gray-200 px-4 py-2 text-right dark:border-gray-800">
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Abrir em nova aba
          </a>
        </div>
      </div>
    </div>
  );
}
