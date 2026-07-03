import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/auth-store'
import { VeniceLogo } from '../ui/logo'
import { toast } from '../../stores/toast-store'
import { validateVeniceKey } from '../../lib/validate-venice-key'

const MIN_PASSPHRASE = 8

export function ApiKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { apiKey, hasEncrypted, setApiKey, unlock, clearApiKey } = useAuthStore()
  const [value, setValue] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forceConnect, setForceConnect] = useState(false)

  // Close on Escape, regardless of which input is focused.
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const isUnlockMode = hasEncrypted && !apiKey && !forceConnect
  const passphraseTooShort = remember && passphrase.length > 0 && passphrase.length < MIN_PASSPHRASE

  const handleConnect = async () => {
    if (!value.trim()) return
    if (remember) {
      if (!passphrase) { setError('Passphrase required to remember this key.'); return }
      if (passphrase.length < MIN_PASSPHRASE) { setError(`Passphrase must be at least ${MIN_PASSPHRASE} characters.`); return }
    }
    setBusy(true)
    setError(null)
    try {
      const validation = await validateVeniceKey(value.trim())
      if (!validation.ok) {
        setError(validation.message)
        return
      }
      await setApiKey(value.trim(), remember ? { passphrase } : undefined)
      toast.success(remember ? 'Key saved (encrypted)' : 'Key set for this session')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save key')
    } finally {
      setBusy(false)
    }
  }

  const handleUnlock = async () => {
    if (!passphrase) return
    setBusy(true)
    setError(null)
    const ok = await unlock(passphrase)
    setBusy(false)
    if (ok) { toast.success('Key unlocked'); onClose() }
    else setError('Wrong passphrase. Try again or use a different key.')
  }

  const titleId = 'apikey-dialog-title'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button aria-label="Close dialog" className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-[#0e0e0e] border border-white/[0.1] rounded-xl p-6 w-full max-w-sm mx-4 animate-scale-in shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <VeniceLogo size={26} />
          <div>
            <h2 id={titleId} className="text-[17px] font-semibold text-white/90">
              {isUnlockMode ? 'Unlock saved key' : 'Connect to Venice'}
            </h2>
            <p className="text-[13px] text-white/50">
              {isUnlockMode
                ? 'Enter your passphrase to decrypt your saved key.'
                : 'Stored in this tab only by default. Encrypt to keep across sessions.'}
            </p>
          </div>
        </div>

        {isUnlockMode ? (
          <div>
            <label htmlFor="apikey-passphrase" className="sr-only">Passphrase</label>
            <input
              id="apikey-passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase"
              className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-[16px] text-white outline-none focus:border-white/[0.25] transition-colors placeholder:text-white/25"
              autoFocus
              autoComplete="current-password"
              onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock() }}
            />
          </div>
        ) : (
          <>
            <label htmlFor="apikey-input" className="sr-only">Venice API key</label>
            <input
              id="apikey-input"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-[16px] text-white outline-none focus:border-white/[0.25] transition-colors font-mono placeholder:text-white/25"
              autoFocus
              autoComplete="off"
              onKeyDown={(e) => { if (e.key === 'Enter' && !remember) handleConnect() }}
            />
            <p className="text-[13px] text-white/40 mt-2">
              Get a key at{' '}
              <a
                href="https://venice.ai/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/65 hover:text-white underline underline-offset-2"
              >
                venice.ai/settings/api
              </a>
              .
            </p>

            <label className="flex items-center gap-2 mt-4 text-[14px] text-white/65 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-white"
              />
              Remember across sessions (encrypted with passphrase)
            </label>

            {remember && (
              <div className="mt-2">
                <label htmlFor="apikey-new-passphrase" className="sr-only">Encryption passphrase</label>
                <input
                  id="apikey-new-passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={`Passphrase (min ${MIN_PASSPHRASE} chars)`}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-3.5 py-2.5 text-[16px] text-white outline-none focus:border-white/[0.25] transition-colors placeholder:text-white/25"
                  autoComplete="new-password"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !passphraseTooShort) handleConnect() }}
                />
                {passphraseTooShort && (
                  <p className="text-[12px] text-yellow-300/85 mt-1">Use at least {MIN_PASSPHRASE} characters.</p>
                )}
                <p className="text-[12px] text-white/40 mt-1">
                  Encrypted with AES-GCM via PBKDF2 (250k iterations). We never see your passphrase or key.
                </p>
              </div>
            )}
          </>
        )}

        {isUnlockMode && (
          <button
            onClick={() => { setForceConnect(true); setError(null); setPassphrase('') }}
            className="mt-3 text-[13px] text-white/55 hover:text-white/85 transition-colors underline underline-offset-2"
          >
            Use a different key
          </button>
        )}

        {/* Reserved slot: keeps the modal height stable whether or not an error is shown. */}
        <div className="min-h-[2.25rem] mt-3" aria-live="polite">
          {error && <p role="alert" className="text-[13px] text-red-300 leading-snug">{error}</p>}
        </div>

        <div className="flex flex-wrap gap-2 mt-6 justify-end">
          {(apiKey || hasEncrypted) && (
            <button
              onClick={() => { clearApiKey(); setValue(''); setPassphrase(''); setRemember(false); toast.info('API key cleared') }}
              className="px-3 py-1.5 text-[14px] text-white/55 hover:text-red-300 transition-colors"
            >
              Disconnect
            </button>
          )}
          <button onClick={onClose} className="px-3 py-1.5 text-[14px] text-white/55 hover:text-white/85 transition-colors">
            Cancel
          </button>
          <button
            onClick={isUnlockMode ? handleUnlock : handleConnect}
            disabled={busy || (isUnlockMode ? !passphrase : !value.trim() || passphraseTooShort)}
            aria-busy={busy || undefined}
            className="px-4 py-1.5 text-[14px] font-medium bg-white text-black rounded-md hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40 focus-visible:outline-offset-2"
          >
            {busy ? '…' : isUnlockMode ? 'Unlock' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
