// Style 4 — Citypop Neon Voyage
// 80s 시티팝 야경 우주. 핑크/시안/퍼플 그라디언트, 네온 그리드 수평선.

function CitypopMap() {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'linear-gradient(180deg, #2D1B4E 0%, #5B2A8B 25%, #C44A8B 55%, #FF6BAA 75%, #FFA56B 100%)',
      fontFamily: '-apple-system, system-ui',
    }}>
      <svg viewBox="0 0 402 874" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="cpHorizon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF1493" stopOpacity="1"/>
            <stop offset="100%" stopColor="#FFB347" stopOpacity="1"/>
          </linearGradient>
          <radialGradient id="cpSun" cx="50%" cy="100%">
            <stop offset="0%" stopColor="#FFE066" stopOpacity="1"/>
            <stop offset="60%" stopColor="#FF6BAA" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#FF1493" stopOpacity="0"/>
          </radialGradient>
          <filter id="cpGlow"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>

        {/* Stars */}
        {Array.from({ length: 100 }).map((_, i) => {
          const cx = (i * 73 + 11) % 402;
          const cy = (i * 137 + 29) % 350;
          const r = (i * 7) % 10 < 2 ? 1.5 : 0.6;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="#fff" opacity={0.4 + ((i*19)%50)/100}/>;
        })}

        {/* Distant sun/planet at horizon */}
        <circle cx="200" cy="430" r="120" fill="url(#cpSun)"/>
        <g stroke="#2D1B4E" strokeWidth="3">
          <line x1="80" y1="380" x2="320" y2="380"/>
          <line x1="100" y1="395" x2="300" y2="395"/>
          <line x1="120" y1="412" x2="280" y2="412"/>
        </g>

        {/* Neon grid horizon (perspective) */}
        <g stroke="#00F0FF" strokeWidth="1" fill="none" opacity="0.85" filter="url(#cpGlow)">
          {/* horizontal grid */}
          {[470, 510, 555, 605, 660, 720, 785, 855].map((y, i) => (
            <line key={i} x1="0" y1={y} x2="402" y2={y}/>
          ))}
          {/* vertical grid lines converging to vanishing point at (200, 430) */}
          {[-12, -9, -6, -3, 0, 3, 6, 9, 12].map((k, i) => (
            <line key={i} x1={200 + k * 60} y1="874" x2={200 + k * 8} y2="470"/>
          ))}
        </g>
        <g stroke="#FF1493" strokeWidth="0.5" fill="none" opacity="0.6">
          {[470, 510, 555, 605, 660, 720, 785, 855].map((y, i) => (
            <line key={i} x1="0" y1={y+2} x2="402" y2={y+2}/>
          ))}
        </g>

        {/* Skyline silhouette around horizon */}
        <g fill="#1A0A2E">
          <path d="M 0 470 L 0 440 L 30 440 L 30 425 L 50 425 L 50 445 L 75 445 L 75 420 L 90 420 L 90 470 Z"/>
          <path d="M 95 470 L 95 450 L 130 450 L 130 430 L 145 430 L 145 470 Z"/>
          <path d="M 280 470 L 280 445 L 310 445 L 310 425 L 330 425 L 330 440 L 360 440 L 360 415 L 380 415 L 380 470 Z"/>
          <path d="M 245 470 L 245 460 L 270 460 L 270 470 Z"/>
        </g>

        {/* Constellation lines (city = stars connected) */}
        <g stroke="#00F0FF" strokeOpacity="0.5" strokeWidth="0.8" fill="none" strokeDasharray="3 3">
          <path d="M 70 245 L 195 273 L 295 195 L 250 250"/>
          <path d="M 195 273 L 205 328 L 210 400 L 310 295"/>
        </g>

        {/* Footprint trail — pink neon dots */}
        <g>
          {[[180,320],[195,360],[215,400],[240,440],[200,470]].map(([x,y],i)=>(
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill="#FF1493" opacity="0.4" filter="url(#cpGlow)"/>
              <circle cx={x} cy={y} r="2.5" fill="#fff"/>
            </g>
          ))}
        </g>

        {/* "WHEREHERE" floating text */}
        <text x="201" y="170" textAnchor="middle" fill="#fff" fontSize="36" fontWeight="900" fontStyle="italic" letterSpacing="-1" opacity="0.92" filter="url(#cpGlow)">WHEREHERE</text>
        <text x="201" y="170" textAnchor="middle" fill="#FF1493" fontSize="36" fontWeight="900" fontStyle="italic" letterSpacing="-1">WHEREHERE</text>
        <text x="201" y="190" textAnchor="middle" fill="#00F0FF" fontSize="9" letterSpacing="6">VOYAGE 1986</text>
      </svg>

      {/* POI markers — neon pills */}
      <NeonPOI x={70} y={245} emoji="🍜" label="우영시멘트"/>
      <NeonPOI x={195} y={273} emoji="🍝" label="우마블"/>
      <NeonPOI x={205} y={328} emoji="🍽" label="지글"/>
      <NeonPOI x={210} y={400} emoji="🍜" label="봉피양"/>
      <NeonPOI x={310} y={295} emoji="🍕" label="파파존스"/>
      <NeonPOI x={295} y={195} emoji="🍵" label="공차"/>
      <NeonPOI x={250} y={250} emoji="💪" label="골든핏"/>

      {/* Friend */}
      <div style={{
        position: 'absolute', left: 320 - 22, top: 365 - 22,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFE066, #FF1493)',
          border: '2px solid #00F0FF',
          boxShadow: '0 0 18px #FF1493, 0 0 30px rgba(0,240,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>⭐</div>
      </div>

      {/* Event */}
      <div style={{
        position: 'absolute', left: 310 - 22, top: 320 - 28,
        filter: 'drop-shadow(0 0 12px #00F0FF)',
      }}>
        <svg width="44" height="56" viewBox="0 0 44 56">
          <path d="M22 4 C 10 4, 4 14, 4 24 C 4 36, 22 52, 22 52 C 22 52, 40 36, 40 24 C 40 14, 34 4, 22 4 Z"
            fill="#00F0FF" stroke="#FF1493" strokeWidth="2"/>
          <text x="22" y="29" textAnchor="middle" fontSize="16">🚀</text>
        </svg>
      </div>

      {/* Hero */}
      <div style={{
        position: 'absolute', left: 195 - 50, top: 425 - 50,
        width: 100, height: 100, pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #FF1493, #00F0FF, #FFE066, #FF1493)',
          opacity: 0.4, filter: 'blur(8px)',
        }}/>
        <div style={{
          position: 'absolute', inset: 25, borderRadius: '50%',
          background: 'rgba(0,240,255,0.3)',
          border: '2px solid #00F0FF',
          boxShadow: '0 0 18px #00F0FF',
        }}/>
        <div style={{
          position: 'absolute', inset: 38, borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF1493, #00F0FF)',
          boxShadow: '0 0 16px #fff, inset 0 0 8px rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>🚀</div>
        <div style={{
          position: 'absolute', left: '50%', bottom: 4, transform: 'translateX(-50%)',
          padding: '1px 8px', background: '#1A0A2E',
          border: '1px solid #FF1493', borderRadius: 4,
          fontSize: 10, color: '#FF1493', fontWeight: 700, whiteSpace: 'nowrap',
        }}>별찌</div>
      </div>

      {/* Status bar */}
      <div style={{ position: 'absolute', top: 21, left: 24, color: '#fff', fontWeight: 590, fontSize: 17, zIndex: 10 }}>5:25</div>
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 6, zIndex: 10, color: '#fff' }}>
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

function NeonPOI({ x, y, emoji, label }) {
  return (
    <div style={{
      position: 'absolute', left: x - 16, top: y - 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'rgba(26,10,46,0.85)',
        border: '2px solid #00F0FF',
        boxShadow: '0 0 10px #FF1493, inset 0 0 6px rgba(0,240,255,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
      }}>{emoji}</div>
      <div style={{
        fontSize: 9, color: '#fff', fontWeight: 600,
        textShadow: '0 0 4px #FF1493',
        letterSpacing: -0.2, whiteSpace: 'nowrap',
      }}>{label}</div>
    </div>
  );
}

window.CitypopMap = CitypopMap;
