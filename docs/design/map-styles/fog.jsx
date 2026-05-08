// Style 3 — Fog of Discovery
// Death Stranding / Sky 톤. 기본은 안개로 덮인 미지의 영역.
// 내가 방문한 곳만 빛으로 밝혀짐. 별빛이 길을 안내.

function FogMap() {
  const accent = '#3DDC97';
  const dim = '#1A1F2E';

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 50%, #1A2942 0%, #0B1426 60%, #050912 100%)',
      fontFamily: '-apple-system, system-ui',
    }}>
      <svg viewBox="0 0 402 874" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="fogReveal" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="1"/>
            <stop offset="40%" stopColor="#fff" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="auraGreen" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#3DDC97" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="#3DDC97" stopOpacity="0"/>
          </radialGradient>
          <filter id="fogBlur"><feGaussianBlur stdDeviation="8"/></filter>
          <mask id="discovered">
            <rect width="100%" height="100%" fill="#000"/>
            {/* discovered halos — current location + footprint trail + a couple visited */}
            <circle cx="200" cy="425" r="120" fill="url(#fogReveal)"/>
            <circle cx="195" cy="365" r="55" fill="url(#fogReveal)"/>
            <circle cx="220" cy="280" r="50" fill="url(#fogReveal)"/>
            <circle cx="80" cy="600" r="40" fill="url(#fogReveal)"/>
            <circle cx="320" cy="350" r="60" fill="url(#fogReveal)"/>
          </mask>
        </defs>

        {/* Star sky background — dense */}
        {Array.from({ length: 200 }).map((_, i) => {
          const cx = (i * 53 + 7) % 402;
          const cy = (i * 109 + 13) % 874;
          const r = (i * 11) % 13 < 2 ? 1.6 : 0.6;
          const op = 0.15 + ((i * 23) % 80) / 100;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="#E8EEFF" opacity={op}/>;
        })}

        {/* Constellation lines (mythic) — faint everywhere */}
        <g stroke="#6BA3FF" strokeOpacity="0.15" strokeWidth="0.6" fill="none">
          <path d="M 60 100 L 120 140 L 180 110 L 230 180"/>
          <path d="M 280 80 L 340 130 L 360 200"/>
          <path d="M 50 700 L 100 730 L 170 720 L 220 770"/>
        </g>

        {/* === Discovered terrain (revealed by mask) === */}
        <g mask="url(#discovered)">
          {/* glowing topographic-like hex grid in revealed areas */}
          <pattern id="hex" patternUnits="userSpaceOnUse" width="20" height="17.32">
            <path d="M 5 0 L 15 0 L 20 8.66 L 15 17.32 L 5 17.32 L 0 8.66 Z"
              fill="none" stroke={accent} strokeWidth="0.4" strokeOpacity="0.45"/>
          </pattern>
          <rect width="402" height="874" fill="url(#hex)"/>

          {/* Subtle terrain shading */}
          <ellipse cx="200" cy="425" rx="100" ry="80" fill={accent} opacity="0.08"/>
          <ellipse cx="320" cy="350" rx="50" ry="40" fill={accent} opacity="0.08"/>
        </g>

        {/* Faint road traces (only near discovered) */}
        <g mask="url(#discovered)" stroke="#A7F5C8" strokeOpacity="0.5" strokeWidth="0.8" fill="none" strokeLinecap="round">
          <path d="M 100 425 Q 200 415 300 430"/>
          <path d="M 200 320 Q 195 425 200 540"/>
        </g>

        {/* Footprint trail — bright glowing pearls */}
        <g>
          {[[180,320],[195,365],[215,405],[240,440],[200,470]].map(([x,y],i)=>(
            <g key={i}>
              <circle cx={x} cy={y} r="10" fill={accent} opacity="0.15"/>
              <circle cx={x} cy={y} r="3" fill={accent} filter="url(#fogBlur)" opacity="0.8"/>
              <circle cx={x} cy={y} r="2" fill="#fff"/>
            </g>
          ))}
        </g>

        {/* Mystery beacons in fog (undiscovered POIs as faint stars) */}
        <g>
          {[[70,245],[295,195],[290,620],[155,500],[60,720]].map(([x,y],i)=>(
            <g key={i} opacity="0.4">
              <circle cx={x} cy={y} r="3" fill="#6BA3FF"/>
              <text x={x} y={y+1} textAnchor="middle" fontSize="10" fill="#6BA3FF">?</text>
            </g>
          ))}
        </g>
      </svg>

      {/* Discovered POIs — bright */}
      <DiscoveredPOI x={195} y={273} emoji="🍝" label="우마블"/>
      <DiscoveredPOI x={205} y={328} emoji="🍽" label="지글"/>
      <DiscoveredPOI x={210} y={400} emoji="🍜" label="봉피양"/>
      <DiscoveredPOI x={310} y={355} emoji="🍕" label="파파존스" event/>

      {/* Friend — distant signal */}
      <div style={{
        position: 'absolute', left: 320 - 22, top: 365 - 22,
        filter: 'drop-shadow(0 0 12px rgba(244,201,93,0.8))',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'radial-gradient(circle, #F4C95D, #FF8A65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: '#fff', fontWeight: 700,
        }}>황</div>
      </div>

      {/* Event — large mint pin */}
      <div style={{
        position: 'absolute', left: 310 - 22, top: 320 - 28,
        filter: 'drop-shadow(0 0 18px rgba(61,220,151,0.95))',
      }}>
        <svg width="44" height="56" viewBox="0 0 44 56">
          <path d="M22 4 C 10 4, 4 14, 4 24 C 4 36, 22 52, 22 52 C 22 52, 40 36, 40 24 C 40 14, 34 4, 22 4 Z"
            fill="#3DDC97"/>
          <text x="22" y="29" textAnchor="middle" fontSize="16">🚀</text>
        </svg>
      </div>

      {/* Hero — beacon of light */}
      <div style={{
        position: 'absolute', left: 200 - 60, top: 425 - 60,
        width: 120, height: 120, pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(61,220,151,0.4) 0%, transparent 60%)',
          animation: 'pulse 2s ease-in-out infinite',
        }}/>
        <div style={{
          position: 'absolute', inset: 35, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(61,220,151,0.6) 50%, transparent 80%)',
        }}/>
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 26, height: 26, borderRadius: '50%',
          background: 'radial-gradient(circle, #fff, #3DDC97)',
          boxShadow: '0 0 30px #3DDC97, 0 0 60px #3DDC97',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12,
        }}>✦</div>
        <div style={{
          position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)',
          padding: '2px 8px', background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(61,220,151,0.7)',
          borderRadius: 8, fontSize: 10, color: '#A7F5C8', fontWeight: 600, whiteSpace: 'nowrap',
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

      {/* Hint text in fog */}
      <div style={{
        position: 'absolute', left: '50%', top: 200, transform: 'translateX(-50%)',
        color: 'rgba(232,238,255,0.5)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
      }}>미지의 영역</div>
    </div>
  );
}

function DiscoveredPOI({ x, y, emoji, label, event }) {
  return (
    <div style={{
      position: 'absolute', left: x - 16, top: y - 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      filter: 'drop-shadow(0 0 6px rgba(167,245,200,0.6))',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #fff, #A7F5C8 60%, #3DDC97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, boxShadow: '0 0 12px rgba(61,220,151,0.6)',
      }}>{emoji}</div>
      <div style={{ fontSize: 9, color: '#A7F5C8', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
}

window.FogMap = FogMap;
