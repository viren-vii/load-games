import { useEffect, useState } from 'react'

export function QrButton() {
  const [open, setOpen] = useState(false)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!open) return
    const href = window.location.href
    setUrl(href)
    let cancelled = false
    import('qrcode').then(QR =>
      QR.toDataURL(href, { margin: 1, width: 320, color: { dark: '#22c55e', light: '#0a0a0a' } }).then(d => {
        if (!cancelled) setDataUrl(d)
      }),
    )
    return () => {
      cancelled = true
    }
  }, [open])

  const isLocalhost = url && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)

  return (
    <>
      <button type="button" style={btnStyle} onClick={() => setOpen(true)} aria-label="Show QR code">
        scan on mobile
      </button>

      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div style={panelStyle} onClick={e => e.stopPropagation()}>
            <button type="button" style={closeStyle} onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
            <div style={titleStyle}>scan to open on mobile</div>

            <div style={qrFrameStyle}>
              {dataUrl ? (
                <img src={dataUrl} alt={`QR code for ${url}`} width={280} height={280} style={{ display: 'block' }} />
              ) : (
                <div style={qrLoadingStyle}>generating…</div>
              )}
            </div>

            <div style={urlStyle}>{url}</div>

            {isLocalhost && (
              <div style={hintStyle}>
                <strong>localhost won't reach your phone.</strong>
                <br />
                run <code style={codeStyle}>pnpm --filter @load-games/demo dev -- --host</code>
                <br />
                then open the LAN URL Vite prints and scan from there.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #22c55e',
  color: '#22c55e',
  padding: '5px 12px',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 11,
  borderRadius: 3,
  letterSpacing: 1,
}
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
}
const panelStyle: React.CSSProperties = {
  position: 'relative',
  background: '#0a0a0a',
  border: '1px solid #22c55e',
  borderRadius: 4,
  padding: '20px 20px 16px',
  maxWidth: 360,
  width: '100%',
  fontFamily: 'monospace',
  color: '#fff',
}
const closeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 8,
  background: 'transparent',
  border: 'none',
  color: '#666',
  cursor: 'pointer',
  fontSize: 22,
  lineHeight: 1,
  padding: 4,
}
const titleStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#666',
  letterSpacing: 2,
  textTransform: 'uppercase',
  marginBottom: 14,
  textAlign: 'center',
}
const qrFrameStyle: React.CSSProperties = {
  background: '#0a0a0a',
  padding: 4,
  borderRadius: 4,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 288,
}
const qrLoadingStyle: React.CSSProperties = { fontSize: 12, color: '#444' }
const urlStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#888',
  wordBreak: 'break-all',
  marginTop: 12,
  padding: '6px 8px',
  background: '#050505',
  border: '1px solid #1a1a1a',
  borderRadius: 3,
}
const hintStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  background: '#050505',
  border: '1px solid #2a2a2a',
  borderRadius: 3,
  fontSize: 11,
  color: '#888',
  lineHeight: 1.5,
}
const codeStyle: React.CSSProperties = {
  background: '#1a1a1a',
  padding: '1px 5px',
  borderRadius: 2,
  color: '#22c55e',
}
