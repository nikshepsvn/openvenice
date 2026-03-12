import { cn } from '../../lib/utils'
import { Spinner } from './spinner'

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-medium text-white/20 uppercase tracking-[0.08em] mb-1">{children}</label>
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 text-[13px] text-white/70 outline-none focus:border-white/[0.1] transition-colors resize-none placeholder:text-white/8"
    />
  )
}

export function PrimaryButton({ onClick, disabled, loading, children }: { onClick: () => void; disabled?: boolean; loading?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'w-full py-1.5 rounded-lg text-[12px] font-medium transition-all duration-100',
        !disabled && !loading
          ? 'bg-white text-black hover:bg-white/90 active:scale-[0.995]'
          : 'bg-white/[0.04] text-white/12 cursor-not-allowed',
      )}
    >
      {loading ? <span className="flex items-center justify-center gap-2"><Spinner className="text-white/25" /> Processing...</span> : children}
    </button>
  )
}

export function PillGroup({ options, value, onChange }: { options: Array<{ value: string; label: string }>; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'text-[11px] font-medium px-2 py-[3px] rounded-md border transition-colors duration-100',
            o.value === value
              ? 'border-white/12 bg-white/[0.07] text-white/80'
              : 'border-white/[0.05] text-white/20 hover:text-white/40 hover:border-white/[0.08]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-red-400/60">{children}</p>
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center flex-1 text-white/10 text-[13px]">{children}</div>
}
