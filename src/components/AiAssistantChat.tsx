import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertCircle,
  Baby,
  Fan,
  Leaf,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import type { QuickActionPrompt } from '../data/airQualityData';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface AiAssistantChatProps {
  messages: ChatMessage[];
  quickActions: QuickActionPrompt[];
  isStreaming: boolean;
  errorMessage: string | null;
  cityLabel: string;
  householdLabel: string;
  aqi: number | null;
  aqiCategory: string;
  onSendMessage: (prompt: string) => void;
  onResetChat: () => void;
}

function getPromptIcon(id: string) {
  switch (id) {
    case 'ventilation':
      return <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />;
    case 'indoor-plants':
      return <Leaf className="w-3.5 h-3.5 text-emerald-300 shrink-0" aria-hidden="true" />;
    case 'outdoor-play':
      return <Baby className="w-3.5 h-3.5 text-rose-300 shrink-0" aria-hidden="true" />;
    default:
      return <Fan className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />;
  }
}

export function AiAssistantChat({
  messages,
  quickActions,
  isStreaming,
  errorMessage,
  cityLabel,
  householdLabel,
  aqi,
  aqiCategory,
  onSendMessage,
  onResetChat,
}: AiAssistantChatProps) {
  const [input, setInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    onSendMessage(trimmed);
  };

  return (
    <section
      id="section-3"
      aria-label="Section 3 — Gemini Intelligence Core"
      className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-10 max-w-[1380px] mx-auto"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 space-y-5 chapter-reveal">
          <p className="text-xs font-mono uppercase tracking-[0.22em] text-rose-400">
            03 · Gemini Intelligence Core
          </p>
          <h2 className="text-3xl sm:text-5xl font-light tracking-[-0.02em] leading-[1.08] text-slate-50 text-balance">
            An advisor grounded in science and empathy.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Every reply mathematically cross-references real-time PM2.5, NO2, ozone, and wind
            dispersion against <strong className="text-amber-300">{householdLabel}</strong> and
            your active indoor filtration habits.
          </p>

          <div className="pt-2 space-y-2.5 text-xs text-slate-400">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isStreaming ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                }`}
                aria-hidden="true"
              />
              <span className="font-mono text-slate-300">
                {isStreaming
                  ? 'Synthesizing atmospheric briefing…'
                  : 'Environmental intelligence ready'}
              </span>
            </div>
            <p className="leading-relaxed">
              Non-diagnostic guidance. Consult a physician promptly if wheezing, chest tightness,
              or acute shortness of breath develops.
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900/95 border border-slate-800 rounded-2xl flex flex-col overflow-hidden chapter-reveal shadow-[0_0_45px_rgba(2,6,23,0.7)]">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-medium text-slate-50">
                  AEROVA Atmospheric Advisor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                  {cityLabel} ·{' '}
                  {aqi !== null ? `US AQI ${Math.round(aqi)} (${aqiCategory})` : 'US AQI Unavailable'}{' '}
                  · {householdLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onResetChat}
              disabled={isStreaming || messages.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-slate-200 hover:text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Thread</span>
            </button>
          </div>

          <div
            ref={scrollContainerRef}
            className="px-4 sm:px-6 py-5 space-y-5 min-h-[340px] max-h-[500px] overflow-y-auto bg-slate-950/85"
          >
            {messages.length === 0 ? (
              <div className="py-4 max-w-2xl">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-emerald-400/40 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4">
                    <p className="text-sm font-semibold text-slate-100">
                      Personalized atmospheric briefing for {cityLabel}
                    </p>
                    <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                      Ask about outdoor play, window ventilation, DIY purifiers, or daily commutes.
                      Responses translate PM2.5, NO2, and ozone metrics for{' '}
                      <strong className="text-amber-300">{householdLabel}</strong>.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[
                        'Can my child play outside today?',
                        'When should I ventilate the house?',
                      ].map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => onSendMessage(starter)}
                          className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-amber-200 bg-slate-950 hover:bg-slate-800 border border-amber-400/35 rounded-xl transition-colors cursor-pointer"
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      aria-hidden="true"
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 border ${
                        isUser
                          ? 'bg-slate-900 border-amber-400/40 text-amber-300'
                          : 'bg-slate-900 border-emerald-400/40 text-emerald-300'
                      }`}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </div>

                    <div
                      className={`flex flex-col max-w-[88%] ${
                        isUser ? 'items-end' : 'items-start flex-1 min-w-0'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 text-xs text-slate-400">
                        <span className="font-medium text-slate-200">
                          {isUser ? 'You' : 'AEROVA Advisor'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{msg.timestamp}</span>
                      </div>

                      {isUser ? (
                        <div className="bg-slate-800 border border-slate-700 text-slate-100 px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
                          {msg.text}
                        </div>
                      ) : (
                        <div className="w-full bg-slate-900 border border-slate-800 px-4 sm:px-5 py-4 rounded-2xl rounded-tl-sm">
                          {msg.text ? (
                            <div className="advisory-markdown">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                            </div>
                          ) : (
                            <div
                              className="flex items-center gap-2 py-1 text-xs text-slate-300"
                              aria-label="Generating response"
                            >
                              <span className="flex items-center gap-1" aria-hidden="true">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 typing-dot-1" />
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 typing-dot-2" />
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 typing-dot-3" />
                              </span>
                              <span>Translating atmospheric telemetry & household safeguards…</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mx-5 mt-3 px-4 py-3 bg-rose-500/12 border border-rose-400/35 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-rose-200"
            >
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="px-4 sm:px-6 pt-3.5 pb-2 border-t border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={isStreaming}
                  title={action.subtitle}
                  onClick={() => onSendMessage(action.prompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] text-xs font-medium text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/40 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {getPromptIcon(action.id)}
                  <span>{action.title}</span>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="px-4 sm:px-6 pb-4 pt-2 bg-slate-900 flex items-center gap-3"
          >
            <label htmlFor="chat-prompt-input" className="sr-only">
              Ask AEROVA Air Quality Assistant
            </label>
            <input
              id="chat-prompt-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask e.g. "Can my child play outside?" or "When should I ventilate the house?"'
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-4 py-2.5 min-h-[46px] text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[46px] bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>{isStreaming ? 'Advising' : 'Ask'}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
