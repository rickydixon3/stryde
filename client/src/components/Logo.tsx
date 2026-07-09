interface LogoMarkProps {
    size?: number
    className?: string
  }
  
  export function LogoMark({ size = 40, className = '' }: LogoMarkProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        className={className}
        role="img"
        aria-label="Stryde"
      >
        <rect width="40" height="40" rx="10" fill="#1D9E75" />
        <path
          d="M9 20 L15.5 20 L18.5 13.5 L21.5 27.5 L24.5 20 L31 20"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  
  // Logo mark + wordmark, for use in the sidebar header and landing page nav.
  export function LogoLockup({ size = 24, textClassName = '' }: { size?: number; textClassName?: string }) {
    return (
      <div className="flex items-center gap-2">
        <LogoMark size={size} />
        <span className={`font-medium text-[#ededed] ${textClassName}`}>Stryde</span>
      </div>
    )
  }