import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '../../lib/utils'

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  searchable?: boolean
  className?: string
}

export function Select({ value, onChange, options, placeholder = 'Select...', searchable = false, className }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && searchable) inputRef.current?.focus()
    if (!open) setSearch('')
  }, [open, searchable])

  const filtered = useMemo(() =>
    search ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())) : options,
    [options, search],
  )

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between gap-2 bg-transparent border border-white/[0.06] rounded-md px-2.5 py-1.5 text-sm hover:border-white/[0.12] transition-colors outline-none',
          open && 'border-white/[0.15]',
        )}
      >
        <span className={cn('truncate text-[12px]', value ? 'text-white/70' : 'text-white/20')}>{selectedLabel}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className={cn('shrink-0 text-white/20 transition-transform duration-150', open && 'rotate-180')}>
          <path d="M2.5 3.75L5 6.25L7.5 3.75" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-0.5 bg-[#0e0e0e] border border-white/[0.08] rounded-lg shadow-2xl shadow-black/50 animate-scale-in overflow-hidden">
          {searchable && (
            <div className="p-1 border-b border-white/[0.04]">
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-white/[0.03] rounded px-2 py-1 text-[12px] text-white/70 outline-none placeholder:text-white/12"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto p-0.5">
            {filtered.length === 0 ? (
              <div className="px-2.5 py-2.5 text-[11px] text-white/15 text-center">No results</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn(
                    'w-full text-left px-2 py-[4px] text-[12px] rounded transition-colors',
                    o.value === value
                      ? 'bg-white/[0.07] text-white/80'
                      : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70',
                  )}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
