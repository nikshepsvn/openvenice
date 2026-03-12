import { cn } from '../../lib/utils'

export function VeniceLogo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {/* Two crossed skeleton keys with open book — Venice coat of arms */}
      <g fill="white">
        {/* Left key shaft (top-left to bottom-right) */}
        <rect x="6.2" y="7.5" width="1.6" height="18" rx="0.8" transform="rotate(-42 6.2 7.5)" />
        {/* Right key shaft (top-right to bottom-left) */}
        <rect x="24.2" y="6.3" width="1.6" height="18" rx="0.8" transform="rotate(42 24.2 6.3)" />
        {/* Left key flag (top-left notch) */}
        <polygon points="7.2,8.8 3.8,7.2 4.5,5.5 8.5,7.2" />
        {/* Right key flag (top-right notch) */}
        <polygon points="24.8,8.8 28.2,7.2 27.5,5.5 23.5,7.2" />
        {/* Cross center diamond */}
        <rect x="14.3" y="14.3" width="3.4" height="3.4" rx="0.4" transform="rotate(45 16 16)" />
        {/* Left key bow (circle with quatrefoil cutout) */}
        <circle cx="9.2" cy="24.5" r="4" />
        <circle cx="9.2" cy="24.5" r="1.7" fill="#0a0a0a" />
        <circle cx="9.2" cy="22.9" r="0.9" fill="#0a0a0a" />
        <circle cx="9.2" cy="26.1" r="0.9" fill="#0a0a0a" />
        <circle cx="7.6" cy="24.5" r="0.9" fill="#0a0a0a" />
        <circle cx="10.8" cy="24.5" r="0.9" fill="#0a0a0a" />
        {/* Right key bow (circle with quatrefoil cutout) */}
        <circle cx="22.8" cy="24.5" r="4" />
        <circle cx="22.8" cy="24.5" r="1.7" fill="#0a0a0a" />
        <circle cx="22.8" cy="22.9" r="0.9" fill="#0a0a0a" />
        <circle cx="22.8" cy="26.1" r="0.9" fill="#0a0a0a" />
        <circle cx="21.2" cy="24.5" r="0.9" fill="#0a0a0a" />
        <circle cx="24.4" cy="24.5" r="0.9" fill="#0a0a0a" />
        {/* Open book at top */}
        <path d="M16 5.5L12.5 8.5V12.5L16 10.5L19.5 12.5V8.5Z" />
      </g>
    </svg>
  )
}

export function VeniceWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-[-0.02em] text-white/90', className)}>
      OpenVenice
    </span>
  )
}
