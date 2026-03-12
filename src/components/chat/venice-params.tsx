import { useState } from 'react'
import { useChatStore } from '../../stores/chat-store'
import { cn } from '../../lib/utils'

export function VeniceParams() {
  const { veniceParams, setVeniceParams, systemPrompt, setSystemPrompt, temperature, setTemperature, topP, setTopP, maxTokens, setMaxTokens } = useChatStore()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="px-4 py-1.5">
      <div className="flex items-center gap-1">
        <SearchPill
          value={veniceParams.enable_web_search || 'off'}
          onChange={(v) => setVeniceParams({ enable_web_search: v })}
        />
        <Pill
          label="Citations"
          active={veniceParams.enable_web_citations === true}
          onClick={() => setVeniceParams({ enable_web_citations: !veniceParams.enable_web_citations })}
        />
        <Pill
          label="Search in stream"
          active={veniceParams.include_search_results_in_stream === true}
          onClick={() => setVeniceParams({ include_search_results_in_stream: !veniceParams.include_search_results_in_stream })}
        />
        <div className="ml-auto">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-2 py-[2px] rounded-full transition-colors duration-100',
              showSettings ? 'bg-white/90 text-black' : 'bg-white/[0.03] text-white/18 hover:text-white/35 hover:bg-white/[0.05]',
            )}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mt-2.5 pb-1 flex flex-col gap-2.5">
          <div>
            <label className="text-[10px] text-white/15 font-medium mb-1 block uppercase tracking-[0.08em]">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              rows={2}
              className="w-full bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2 text-[12px] text-white/50 outline-none resize-none placeholder:text-white/8 focus:border-white/[0.1] transition-colors"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <ParamSlider label="Temperature" value={temperature} onChange={setTemperature} min={0} max={2} step={0.1} />
            <ParamSlider label="Top P" value={topP} onChange={setTopP} min={0} max={1} step={0.05} />
            <ParamSlider label="Max Tokens" value={maxTokens} onChange={setMaxTokens} min={256} max={32768} step={256} format={(v) => v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(v)} />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Toggle label="Venice system prompt" active={veniceParams.include_venice_system_prompt !== false} onChange={(v) => setVeniceParams({ include_venice_system_prompt: v })} />
            <Toggle label="Disable thinking" active={veniceParams.disable_thinking === true} onChange={(v) => setVeniceParams({ disable_thinking: v })} />
            <Toggle label="Strip thinking" active={veniceParams.strip_thinking_response === true} onChange={(v) => setVeniceParams({ strip_thinking_response: v })} />
          </div>
        </div>
      )}
    </div>
  )
}

function ParamSlider({ label, value, onChange, min, max, step, format }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format?: (v: number) => string
}) {
  const display = format ? format(value) : String(value)
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[9px] text-white/15 font-medium uppercase tracking-[0.08em]">{label}</label>
        <span className="text-[9px] text-white/25 font-mono">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  )
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[10px] font-medium px-2 py-[2px] rounded-full transition-colors duration-100',
        active
          ? 'bg-white/90 text-black'
          : 'bg-white/[0.03] text-white/18 hover:text-white/35 hover:bg-white/[0.05]',
      )}
    >
      {label}
    </button>
  )
}

const SEARCH_MODES = ['off', 'on', 'auto'] as const
type SearchMode = (typeof SEARCH_MODES)[number]

function SearchPill({ value, onChange }: { value: string; onChange: (v: SearchMode) => void }) {
  const current = SEARCH_MODES.indexOf(value as SearchMode)
  const next = () => onChange(SEARCH_MODES[(current + 1) % SEARCH_MODES.length])
  const label = `Search: ${value}`
  const active = value !== 'off'

  return (
    <button
      onClick={next}
      className={cn(
        'text-[10px] font-medium px-2 py-[2px] rounded-full transition-colors duration-100',
        active
          ? 'bg-white/90 text-black'
          : 'bg-white/[0.03] text-white/18 hover:text-white/35 hover:bg-white/[0.05]',
      )}
    >
      {label}
    </button>
  )
}

function Toggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/50 transition-colors"
    >
      <div className={cn(
        'w-6 h-3.5 rounded-full transition-colors duration-150 relative',
        active ? 'bg-white/80' : 'bg-white/[0.08]',
      )}>
        <div className={cn(
          'absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all duration-150',
          active ? 'left-3 bg-black' : 'left-0.5 bg-white/30',
        )} />
      </div>
      {label}
    </button>
  )
}
