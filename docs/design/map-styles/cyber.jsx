// Style 5 — Cyberpunk Hologram
// 사이버펑크 HUD/홀로그램 항해도. 그리드 + 글리치 + 와이어프레임 도시.

function CyberMap() {
  const cyan = '#00F5FF';
  const pink = '#FF2E9A';
  const accent = '#3DDC97';

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 60%, #0A1628 0%, #050810 70%, #000 100%)',
      fontFamily: '"SF Mono", "JetBrains Mono", monospace',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5,
        background: 'repeating-linear-gradient(0deg, rgba(0,245,255,0.03) 0, rgba(0,245,255,0.03) 1px, transparent 1px, transparent 3px)',
      }}/>

      <svg viewBox="0 0 402 874" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <filter id="cyGlow"><feGaussianBlur stdDeviation="2"/></filter>
          <pattern id="cyGrid" patternUnits="userSpaceOnUse" width="30" height="30">
            <path d="M 30 0 L 0 0 0 30" stroke={cyan} strokeOpacity="0.18" strokeWidth="0.5" fill="none"/>
          </pattern>
          <pattern id="cyGridMajor" patternUnits="userSpaceOnUse" width="120" height="120">
            <path d="M 120 0 L 0 0 0 120" stroke={cyan} strokeOpacity="0.4" strokeWidth="0.8" fill="none"/>
          </pattern>
        </defs>

        {/* Grid background */}
        <rect width="402" height="874" fill="url(#cyGrid)"/>
        <rect width="402" height="874" fill="url(#cyGridMajor)"/>

        {/* Wireframe districts */}
        <g stroke={cyan} strokeWidth="1" fill="rgba(0,245,255,0.04)" strokeOpacity="0.7">
          <polygon points="20,200 140,180 160,310 30,330"/>
          <polygon points="170,260 290,230 310,380 200,420 160,360"/>
          <polygon points="320,180 380,200 380,360 310,340"/>
          <polygon points="50,540 170,520 200,680 80,700"/>
          <polygon points="220,500 360,490 380,660 240,680"/>
        </g>

        {/* District labels */}
        <g fill={cyan} fontSize="8" fontFamily='"SF Mono", monospace' opacity="0.7" letterSpacing="2">
          <text x="40" y="270">SECTOR-7</text>
          <text x="200" y="340">CENTRAL</text>
          <text x="330" y="270">EAST.NODE</text>
          <text x="80" y="620">SECTOR-3</text>
          <text x="260" y="590">UPLINK</text>
        </g>

        {/* Highway data streams */}
        <g stroke={pink} strokeWidth="1.5" fill="none" filter="url(#cyGlow)" opacity="0.85">
          <path d="M 0 380 L 100 385 L 180 400 L 280 405 L 402 415"/>
          <path d="M 200 0 L 205 200 L 215 400 L 220 600 L 225 874"/>
        </g>
        <g stroke="#fff" strokeWidth="0.5" fill="none" strokeDasharray="4 6" opacity="0.6">
          <path d="M 0 380 L 100 385 L 180 400 L 280 405 L 402 415"/>
          <path d="M 200 0 L 205 200 L 215 400 L 220 600 L 225 874"/>
        </g>

        {/* River = data conduit */}
        <path d="M 380 0 Q 360 200 380 400 Q 410 600 370 874"
          stroke={cyan} strokeWidth="3" fill="none" opacity="0.7" filter="url(#cyGlow)"/>

        {/* HUD crosshair around hero */}
        <g stroke={accent} strokeWidth="1" fill="none" opacity="0.85">
          <circle cx="195" cy="425" r="60" strokeDasharray="3 3"/>
          <circle cx="195" cy="425" r="80" strokeOpacity="0.5"/>
          <line x1="195" y1="335" x2="195" y2="355"/>
          <line x1="195" y1="495" x2="195" y2="515"/>
          <line x1="105" y1="425" x2="125" y2="425"/>
          <line x1="265" y1="425" x2="285" y2="425"/>
          {/* corner brackets */}
          <path d="M 135 365 L 145 365 L 145 375"/>
          <path d="M 255 365 L 245 365 L 245 375"/>
          <path d="M 135 485 L 145 485 L 145 475"/>
          <path d="M 255 485 L 245 485 L 245 475"/>
        </g>

        {/* Footprint = data packet trail */}
        <g>
          {[[180,320],[195,365],[215,405],[240,440],[200,470]].map(([x,y],i)=>(
            <g key={i}>
              <rect x={x-3} y={y-3} width="6" height="6" fill="none" stroke={accent} strokeWidth="1"/>
              <rect x={x-1.5} y={y-1.5} width="3" height="3" fill={accent}/>
            </g>
          ))}
        </g>

        {/* Terminal readout corners */}
        <g fill={cyan} fontSize="9" fontFamily='"SF Mono", monospace' opacity="0.7" letterSpacing="1">
          <text x="14" y="160">// LAT 37.34921</text>
          <text x="14" y="172">// LNG 127.10583</text>
          <text x="14" y="184">// SCAN.RADIUS 80M</text>
          <text x="14" y="196" fill={accent}>// STATUS: ONLINE</text>
        </g>
        <g fill={pink} fontSize="9" fontFamily='"SF Mono", monospace' opacity="0.65" letterSpacing="1" textAnchor="end">
          <text x="388" y="780">[ENTITIES: 09]</text>
          <text x="388" y="792">[ALLIES: 01]</text>
          <text x="388" y="804">[EVENTS: 01]</text>
        </g>

        {/* Glitch bars */}
        <g opacity="0.4">
          <rect x="0" y="240" width="402" height="1.5" fill={pink}/>
          <rect x="0" y="660" width="402" height="0.8" fill={cyan}/>
        </g>
      </svg>

      {/* POIs as data nodes */}
      <DataNode x={70} y={245} emoji="🍜" label="WUYOUNG"/>
      <DataNode x={195} y={273} emoji="🍝" label="WMARBLE"/>
      <DataNode x={205} y={328} emoji="🍽" label="JIGGLE"/>
      <DataNode x={210} y={400} emoji="🍜" label="BONGPI"/>
      <DataNode x={310} y={295} emoji="🍕" label="PAPAJOH"/>
      <DataNode x={295} y={195} emoji="🍵" label="GONGCHA"/>
      <DataNode x={250} y={250} emoji="💪" label="GOLDEN"/>

      {/* Friend node */}
      <div style={{
        position: 'absolute', left: 320 - 22, top: 365 - 22,
      }}>
        <div style={{
          width: 44, height: 44,
          background: 'rgba(255,46,154,0.15)',
          border: `2px solid ${pink}`,
          boxShadow: `0 0 16px ${pink}, inset 0 0 12px rgba(255,46,154,0.4)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: pink, fontWeight: 700,
          clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        }}>황</div>
      </div>

      {/* Event */}
      <div style={{
        position: 'absolute', left: 310 - 22, top: 320 - 22,
      }}>
        <div style={{
          width: 44, height: 44,
          background: 'rgba(61,220,151,0.15)',
          border: `2px solid ${accent}`,
          boxShadow: `0 0 16px ${accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
          clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        }}>🚀</div>
      </div>

      {/* Hero — HUD avatar */}
      <div style={{
        position: 'absolute', left: 195 - 22, top: 425 - 22,
        width: 44, height: 44,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(61,220,151,0.2)',
          border: `2px solid ${accent}`,
          boxShadow: `0 0 18px ${accent}, inset 0 0 12px rgba(61,220,151,0.5)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        }}>🚀</div>
        <div style={{
          position: 'absolute', left: '50%', bottom: -16, transform: 'translateX(-50%)',
          padding: '0 6px', background: '#000',
          border: `1px solid ${accent}`,
          fontSize: 9, color: accent, fontWeight: 700, whiteSpace: 'nowrap',
          fontFamily: '"SF Mono", monospace', letterSpacing: 1,
        }}>BYULJJI_20</div>
      </div>

      {/* Status bar */}
      <div style={{ position: 'absolute', top: 21, left: 24, color: cyan, fontWeight: 590, fontSize: 17, zIndex: 10, fontFamily: '-apple-system' }}>5:25</div>
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 6, zIndex: 10, color: cyan }}>
        <svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="currentColor"/><rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="currentColor"/><rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="currentColor"/><rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="currentColor"/></svg>
        <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" fill="none"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/></svg>
      </div>

      <RightStack tone="dark"/>
      <XPBadge tone="dark"/>
      <BottomRightFABs tone="dark"/>
      <TabBar active="map" tone="dark"/>
    </div>
  );
}

function DataNode({ x, y, emoji, label }) {
  const cyan = '#00F5FF';
  return (
    <div style={{
      position: 'absolute', left: x - 16, top: y - 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    }}>
      <div style={{
        width: 30, height: 30,
        background: 'rgba(0,245,255,0.1)',
        border: `1.5px solid ${cyan}`,
        boxShadow: `0 0 8px ${cyan}, inset 0 0 6px rgba(0,245,255,0.3)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
        clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
      }}>{emoji}</div>
      <div style={{
        fontSize: 8, color: cyan, fontWeight: 600,
        fontFamily: '"SF Mono", monospace', letterSpacing: 1,
        whiteSpace: 'nowrap',
      }}>{label}</div>
    </div>
  );
}

window.CyberMap = CyberMap;
