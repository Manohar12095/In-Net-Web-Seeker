export function WaveBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none">
      {/* Deep atmospheric radial glow */}
      <div 
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full blur-[120px] animate-pulse-glow"
        style={{
          background: "radial-gradient(circle, rgba(45, 212, 191, 0.12) 0%, rgba(18, 18, 26, 0.05) 70%, transparent 100%)",
        }}
      />
      
      {/* Secondary subtle ambient aura */}
      <div 
        className="absolute top-1/3 -right-40 w-[600px] h-[400px] rounded-full blur-[140px]"
        style={{
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Primary SVG Wave mesh */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 800"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#2DD4BF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.0" />
            <stop offset="45%" stopColor="#2DD4BF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="waveGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.1" />
            <stop offset="70%" stopColor="#14B8A6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0A0A0F" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Slow drifting deep wave */}
        <path
          className="animate-wave-slow"
          fill="none"
          stroke="url(#waveGrad1)"
          strokeWidth="1.75"
          d="M0,280 C280,210 420,380 720,290 C1020,200 1200,340 1440,270 L1440,800 L0,800 Z"
        />

        {/* Counter wave */}
        <path
          className="animate-wave-fast"
          fill="none"
          stroke="url(#waveGrad2)"
          strokeWidth="1.25"
          d="M0,340 C220,410 480,240 760,330 C1040,420 1260,260 1440,320 L1440,800 L0,800 Z"
        />

        {/* Foreground rhythmic lines */}
        <path
          fill="none"
          stroke="url(#waveGrad3)"
          strokeWidth="0.75"
          strokeDasharray="4 6"
          d="M0,390 C260,330 520,450 820,370 C1120,290 1320,410 1440,360"
        />
        <path
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.5"
          d="M0,430 C300,370 600,480 900,420 C1200,360 1350,440 1440,400"
        />
      </svg>

      {/* Subtle cockpit grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
}
