"use client";

import { useState } from "react";
import { Icons } from "./icons";
import type { AIProvider } from "@/lib/ai-service";

export type AppSettings = {
  provider: AIProvider;
  openaiKey: string;
  anthropicKey: string;
  groqKey: string;
};

const PROVIDERS: AIProvider[] = ["heuristic", "openai", "anthropic", "groq"];

export default function SettingsModal({
  initialSettings,
  onClose,
  onSave,
}: {
  initialSettings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  const activeKeyLabel =
    settings.provider === "openai"
      ? "OpenAI API key"
      : settings.provider === "anthropic"
      ? "Anthropic API key"
      : settings.provider === "groq"
      ? "Groq API key"
      : "No key required";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm animate-float-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white card-shadow overflow-hidden max-h-[88vh] flex flex-col">
        <div className="p-6 bg-gradient-to-br from-slate-900 to-indigo-700 text-white flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Icons.Settings2 className="w-5 h-5" /> Application Settings
            </h2>
            <p className="text-sm text-white/80 mt-1">
              Pick the AI provider, paste your API key, and the app will use it for analysis and chat.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 shrink-0" aria-label="Close settings">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto scrollbar-thin space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">Default AI provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setSettings((prev) => ({ ...prev, provider: p }))}
                  className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition capitalize ${
                    settings.provider === p
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 hover:border-indigo-300 text-slate-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-700 mb-1">Active provider key</div>
            <div className="text-sm text-slate-600">{activeKeyLabel}</div>
            <p className="mt-2 text-xs text-slate-500">
              Keys stay in your browser local storage for demo convenience. If you switch providers, just paste the
              matching key here.
            </p>
          </div>

          <div className="grid gap-4">
            <KeyField
              label="OpenAI API key"
              value={settings.openaiKey}
              onChange={(v) => setSettings((prev) => ({ ...prev, openaiKey: v }))}
              placeholder="sk-..."
            />
            <KeyField
              label="Anthropic API key"
              value={settings.anthropicKey}
              onChange={(v) => setSettings((prev) => ({ ...prev, anthropicKey: v }))}
              placeholder="sk-ant-..."
            />
            <KeyField
              label="Groq API key"
              value={settings.groqKey}
              onChange={(v) => setSettings((prev) => ({ ...prev, groqKey: v }))}
              placeholder="gsk_..."
            />
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 p-4 bg-white">
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Icons.Sparkles className="w-4 h-4 text-indigo-600" /> Reliability tips
            </div>
            <ul className="mt-2 text-sm text-slate-600 space-y-1 list-disc pl-5">
              <li>Heuristic mode always works, even without any keys.</li>
              <li>OpenAI, Anthropic, and Groq are supported by the same dashboard and chat assistant.</li>
              <li>Keys are only used by the backend route for the current session.</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(settings)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700 block mb-1">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
      />
    </div>
  );
}
