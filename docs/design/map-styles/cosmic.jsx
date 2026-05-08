// Style 1 — Cosmic Cartographer
// 깊은 우주 항해도. 도로 = 별자리 라인, 구역 = 성운, POI = 행성/위성

function CosmicMap() {
  // shared map glyph & helpers ----------------------------------------------
  const accent = '#3DDC97';   // existing brand mint
  const ink = '#0A0E27';
  const star = '#E8EEFF';
  const dust = '#A78BFA';     // nebula purple
  const ember = '#FF8A65';    // poi warm
  const gold = '#F4C95D';     // friend/special

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 30% 20%, #1B1845 0%, #0A0E27 55%, #050817 100%)',
      fontFamily: '-apple-system, system-ui',
    }}>
      {/* Star field --------------------------------------------------------- */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id="cnebula1" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.55"/>
            <stop offset="50%" stopColor="#7C5CFF" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="cnebula2" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#3DDC97" stopOpacity="0.45"/>
            <stop offset="60%" stopColor="#3DDC97" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="#3DDC97" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="cnebula3" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FF6BAA" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#FF6BAA" stopOpacity="0"/>
          </radialGradient>
          <filter id="cglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5"/>
          </filter>
        </defs>

        {/* Nebula clouds = "neighborhoods" */}
        <ellipse cx="120" cy="180" rx="180" ry="140" fill="url(#cnebula1)"/>
        <ellipse cx="320" cy="420" rx="220" ry="160" fill="url(#cnebula2)"/>
        <ellipse cx="80" cy="600" rx="140" ry="180" fill="url(#cnebula3)"/>
        <ellipse cx="340" cy="700" rx="160" ry="120" fill="url(#cnebula1)"/>

        {/* Tiny stars (background dust) */}
        {Array.from({ length: 140 }).map((_, i) => {
          const cx = (i * 73 + 11) % 402;
          const cy = (i * 137 + 29) % 874;
          const r = (i * 7) % 10 < 2 ? 1.4 : 0.7;
          const op = 0.2 + ((i * 19) % 70) / 100;
          return <circle key={i} cx={cx} cy={cy} r={r} fill={star} opacity={op}/>;
        })}

        {/* Constellation streets — connect POIs into asterisms */}
        <g stroke={accent} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 4" fill="none">
          <path d="M 60 240 L 200 280 L 310 200 L 360 350 L 280 480"/>
          <path d="M 200 280 L 220 460 L 130 540 L 60 700"/>
          <path d="M 310 200 L 360 350 L 380 540 L 320 660"/>
          <path d="M 130 540 L 220 460 L 280 480 L 320 660"/>
        </g>

        {/* Galactic spiral arm — major "highway" */}
        <path
          d="M 0 380 Q 100 360 180 400 T 360 440 T 520 420"
          stroke={accent} strokeOpacity="0.55" strokeWidth="2" fill="none"
          filter="url(#cglow)"
        />
        <path
          d="M 0 380 Q 100 360 180 400 T 360 440 T 520 420"
          stroke={star} strokeOpacity="0.9" strokeWidth="0.6" fill="none"
        />

        {/* River → cosmic stream (purple) */}
        <path
          d="M 380 0 Q 360 200 380 400 Q 410 600 370 874"
          stroke={dust} strokeOpacity="0.7" strokeWidth="6" fill="none"
          filter="url(#cglow)"
        />
        <path
          d="M 380 0 Q 360 200 380 400 Q 410 600 370 874"
          stroke="#C4B5FD" strokeOpacity="0.9" strokeWidth="1.5" fill="none"
        />

        {/* Visited footprint trail — glowing dots */}
        <g>
          {[
            [180, 320], [195, 365], [215, 405], [240, 440], [200, 470]
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill={accent} opacity="0.25"/>
              <circle cx={x} cy={y} r="2.5" fill={accent}/>
            </g>
          ))}
        </g>
      </svg>

      {/* POI = small planets */}
      <Planet x={70} y={245} color="#FF8A65" emoji="🍜" label="우영시멘트"/>
      <Planet x={195} y={273} color="#FF8A65" emoji="🍝" label="우마블"/>
      <Planet x={205} y={328} color="#FF8A65" emoji="🍽" label="지글"/>
      <Planet x={210} y={400} color="#FF8A65" emoji="🍜" label="봉피양"/>
      <Planet x={310} y={295} color="#FF8A65" emoji="🍕" label="파파존스"/>
      <Planet x={295} y={195} color="#FF8A65" emoji="🍵" label="공차"/>
      <Planet x={250} y={250} color="#5BC8FF" emoji="💪" label="골든핏"/>
      <Planet x={155} y={500} color="#9CA3AF" emoji="🏢" label="네이버"/>
      <Planet x={290} y={620} color="#9CA3AF" emoji="🏫" label="늘푸른중"/>

      {/* Friend marker — distant gold star */}
      <FriendStar x={325} y={365} name="황상연"/>

      {/* Event marker — large mint pin */}
      <EventPin x={310} y={355}/>

      {/* Hero — me, the navigator */}
      <Hero x={195} y={425}/>

      {/* === UI overlays (kept consistent across all 5 styles) === */}

      {/* Status bar text */}
      <div style={{
        position: 'absolute', top: 21, left: 24, color: star,
        fontFamily: '-apple-system, "SF Pro"', fontWeight: 590, fontSize: 17, zIndex: 10,
      }}>5:25</div>
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 6, zIndex: 10 }}>
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={star}/>
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={star}/>
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={star}/>
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={star}/>
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={star}/>
          <circle cx="8.5" cy="10.5" r="1.5" fill={star}/>
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={star} strokeOpacity="0.5" fill="none"/>
          <rect x="2" y="2" width="20" height="9" rx="2" fill={star}/>
        </svg>
      </div>

      {/* Top-right action stack */}
      <RightStack tone="dark"/>

      {/* Top-left XP badge */}
      <XPBadge tone="dark"/>

      {/* Bottom-right FABs */}
      <BottomRightFABs tone="dark"/>

      {/* Tab bar */}
      <TabBar active="map" tone="dark"/>
    </div>
  );
}

// ── shared decorative components used by Style 1 only (and shared CSS) ─────
function Planet({ x, y, color, emoji, label }) {
  return (
    <div style={{
      position: 'absolute', left: x - 16, top: y - 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${color}, ${color}99 60%, ${color}44)`,
        boxShadow: `0 0 14px ${color}88, inset -3px -3px 6px rgba(0,0,0,0.4)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>{emoji}</div>
      <div style={{
        fontSize: 9, color: '#E8EEFF', fontWeight: 500,
        textShadow: '0 0 4px rgba(0,0,0,0.8)',
        letterSpacing: -0.2, whiteSpace: 'nowrap',
      }}>{label}</div>
    </div>
  );
}

function FriendStar({ x, y, name }) {
  return (
    <div style={{
      position: 'absolute', left: x - 22, top: y - 22,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'radial-gradient(circle, #F4C95D 0%, #FF8A65 100%)',
        boxShadow: '0 0 24px rgba(244,201,93,0.7), inset 0 -2px 4px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>⭐</div>
      <div style={{
        marginTop: 2, padding: '2px 8px', background: 'rgba(10,14,39,0.85)',
        border: '1px solid rgba(244,201,93,0.5)',
        borderRadius: 8, fontSize: 10, color: '#F4C95D', fontWeight: 600,
      }}>{name}</div>
    </div>
  );
}

function EventPin({ x, y }) {
  return (
    <div style={{
      position: 'absolute', left: x - 22, top: y - 28,
      filter: 'drop-shadow(0 0 12px rgba(61,220,151,0.8))',
    }}>
      <svg width="44" height="56" viewBox="0 0 44 56">
        <defs>
          <radialGradient id="cevent">
            <stop offset="0%" stopColor="#A7F5C8"/>
            <stop offset="100%" stopColor="#3DDC97"/>
          </radialGradient>
        </defs>
        <path d="M22 4 C 10 4, 4 14, 4 24 C 4 36, 22 52, 22 52 C 22 52, 40 36, 40 24 C 40 14, 34 4, 22 4 Z"
          fill="url(#cevent)" stroke="#A7F5C8" strokeWidth="1.5"/>
        <text x="22" y="29" textAnchor="middle" fontSize="16">🚀</text>
      </svg>
    </div>
  );
}

function Hero({ x, y }) {
  return (
    <div style={{
      position: 'absolute', left: x - 50, top: y - 50,
      width: 100, height: 100, pointerEvents: 'none',
    }}>
      {/* Outer pulse */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(61,220,151,0.25) 0%, transparent 70%)',
        boxShadow: '0 0 0 1px rgba(61,220,151,0.3)',
      }}/>
      {/* Mid ring */}
      <div style={{
        position: 'absolute', inset: 25, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(61,220,151,0.5) 0%, rgba(61,220,151,0.15) 70%)',
      }}/>
      {/* Spaceship core */}
      <div style={{
        position: 'absolute', inset: 38, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #fff, #3DDC97 60%, #1A8A5A)',
        boxShadow: '0 0 20px #3DDC97, inset -2px -2px 4px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>🚀</div>
      {/* Name tag */}
      <div style={{
        position: 'absolute', left: '50%', bottom: -2, transform: 'translateX(-50%)',
        padding: '2px 8px', background: 'rgba(10,14,39,0.9)',
        border: '1px solid #3DDC97', borderRadius: 8,
        fontSize: 10, color: '#A7F5C8', fontWeight: 600, whiteSpace: 'nowrap',
      }}>별찌</div>
    </div>
  );
}

window.CosmicMap = CosmicMap;
