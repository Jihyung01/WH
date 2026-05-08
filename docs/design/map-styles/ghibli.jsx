// Style 2 — Ghibli Treasure Map
// 손그림 양피지 보물지도. 잉크 라인 + 수채 워시. 우주는 옛날 천체도처럼.

function GhibliMap() {
  const ink = '#3D2817';
  const parchment1 = '#F4E4C1';
  const parchment2 = '#E8D5A8';
  const wash = '#7BA88F';
  const water = '#9BC4D8';
  const accent = '#3DDC97';

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: `radial-gradient(ellipse at 30% 20%, ${parchment1} 0%, ${parchment2} 70%, #C9B07A 100%)`,
      fontFamily: 'Georgia, "Times New Roman", serif',
    }}>
      {/* Paper texture noise */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
        <defs>
          <filter id="ghpaper">
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3"/>
            <feColorMatrix values="0 0 0 0 0.4   0 0 0 0 0.3   0 0 0 0 0.15   0 0 0 0.15 0"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#ghpaper)"/>
      </svg>

      {/* Burnt edges */}
      <div style={{
        position: 'absolute', inset: 0,
        boxShadow: 'inset 0 0 80px rgba(101,67,33,0.5), inset 0 0 30px rgba(101,67,33,0.4)',
        pointerEvents: 'none',
      }}/>

      {/* Hand-drawn map elements */}
      <svg viewBox="0 0 402 874" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <pattern id="ghforest" patternUnits="userSpaceOnUse" width="14" height="14">
            <circle cx="3" cy="7" r="2.5" fill={wash} opacity="0.55"/>
            <circle cx="9" cy="4" r="2" fill={wash} opacity="0.45"/>
            <circle cx="11" cy="11" r="2.2" fill={wash} opacity="0.5"/>
          </pattern>
          <pattern id="ghwater" patternUnits="userSpaceOnUse" width="20" height="10">
            <path d="M0 5 Q 5 0 10 5 T 20 5" stroke={ink} strokeWidth="0.6" fill="none" opacity="0.5"/>
          </pattern>
        </defs>

        {/* Forests (parks/green areas) */}
        <path d="M 0 200 Q 60 180 120 220 L 130 320 Q 70 340 0 310 Z" fill="url(#ghforest)" stroke={ink} strokeWidth="1" strokeOpacity="0.4"/>
        <path d="M 280 600 Q 360 580 402 620 L 402 730 Q 340 750 270 720 Z" fill="url(#ghforest)" stroke={ink} strokeWidth="1" strokeOpacity="0.4"/>

        {/* River - hand drawn waves */}
        <path d="M 380 0 Q 365 200 385 400 Q 410 600 375 874" stroke={ink} strokeWidth="1.5" fill="none" strokeOpacity="0.6"/>
        <path d="M 380 0 Q 365 200 385 400 Q 410 600 375 874" stroke={water} strokeWidth="14" fill="none" opacity="0.55"/>
        <path d="M 380 0 Q 365 200 385 400 Q 410 600 375 874" stroke="url(#ghwater)" strokeWidth="14" fill="none"/>

        {/* Roads — wobbly double lines (treasure map style) */}
        <g stroke={ink} strokeWidth="1.2" fill="none" strokeOpacity="0.7" strokeLinecap="round">
          <path d="M 0 380 Q 100 372 180 388 Q 260 405 340 395 L 402 410" strokeDasharray="6 4"/>
          <path d="M 200 0 Q 195 200 210 400 Q 225 600 220 874" strokeDasharray="6 4"/>
          <path d="M 0 540 Q 120 530 240 545 Q 320 555 402 545" strokeDasharray="6 4"/>
        </g>

        {/* Compass rose */}
        <g transform="translate(330, 130)">
          <circle r="32" fill="none" stroke={ink} strokeWidth="1" strokeOpacity="0.5"/>
          <circle r="22" fill="none" stroke={ink} strokeWidth="0.6" strokeOpacity="0.4"/>
          <path d="M 0 -28 L 4 0 L 0 28 L -4 0 Z" fill={ink} fillOpacity="0.7"/>
          <path d="M -28 0 L 0 -3 L 28 0 L 0 3 Z" fill={ink} fillOpacity="0.4"/>
          <text y="-36" textAnchor="middle" fontSize="11" fill={ink} fontWeight="bold">N</text>
        </g>

        {/* Sea monster doodle (corner flourish) */}
        <g transform="translate(50, 760)" stroke={ink} strokeWidth="1" fill="none" strokeOpacity="0.55">
          <path d="M 0 0 Q 10 -8 20 0 T 40 0"/>
          <circle cx="36" cy="-2" r="1.5" fill={ink}/>
        </g>

        {/* Stars in sky pocket */}
        <g fill={ink} fillOpacity="0.4">
          <text x="40" y="80" fontSize="14">✦</text>
          <text x="100" y="60" fontSize="10">✦</text>
          <text x="160" y="100" fontSize="12">✧</text>
          <text x="60" y="140" fontSize="9">✧</text>
        </g>

        {/* Visited footprint trail — small ink dots with wobble */}
        <g fill={ink}>
          {[[180,320],[195,360],[215,400],[240,440],[200,470]].map(([x,y],i)=>(
            <g key={i} opacity="0.7">
              <circle cx={x} cy={y} r="3"/>
              <circle cx={x+1} cy={y-1} r="0.8" fill={parchment1}/>
            </g>
          ))}
        </g>

        {/* X marks the spot — event */}
        <g transform="translate(310, 350)" stroke={accent} strokeWidth="3" strokeLinecap="round">
          <path d="M -10 -10 L 10 10"/>
          <path d="M 10 -10 L -10 10"/>
          <circle r="18" fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="3 2"/>
        </g>
      </svg>

      {/* POI markers — ink stamp style */}
      <InkStamp x={70} y={245} emoji="🍜" label="우영시멘트"/>
      <InkStamp x={195} y={273} emoji="🍝" label="우마블"/>
      <InkStamp x={205} y={328} emoji="🍽" label="지글"/>
      <InkStamp x={210} y={400} emoji="🍜" label="봉피양"/>
      <InkStamp x={310} y={295} emoji="🍕" label="파파존스"/>
      <InkStamp x={295} y={195} emoji="🍵" label="공차"/>
      <InkStamp x={250} y={250} emoji="💪" label="골든핏"/>
      <InkStamp x={155} y={500} emoji="🏯" label="네이버"/>
      <InkStamp x={290} y={620} emoji="🏫" label="늘푸른중"/>

      {/* Friend marker — feather quill */}
      <div style={{
        position: 'absolute', left: 320 - 22, top: 365 - 32,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'radial-gradient(circle, #F4C95D, #C9803E)',
          border: `2px solid ${ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, boxShadow: '2px 3px 0 rgba(61,40,23,0.4)',
        }}>🦋</div>
        <div style={{
          marginTop: 2, padding: '1px 6px', background: parchment1,
          border: `1px solid ${ink}`, borderRadius: 2,
          fontSize: 10, color: ink, fontWeight: 700, fontFamily: 'Georgia, serif',
        }}>황상연</div>
      </div>

      {/* Hero — me with sextant */}
      <div style={{
        position: 'absolute', left: 195 - 50, top: 425 - 50,
        width: 100, height: 100, pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: `1.5px dashed ${ink}`, opacity: 0.5,
        }}/>
        <div style={{
          position: 'absolute', inset: 25, borderRadius: '50%',
          background: 'rgba(61,220,151,0.2)',
          border: `2px solid ${accent}`,
        }}/>
        <div style={{
          position: 'absolute', inset: 38, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #F4E4C1, #C9803E)',
          border: `2.5px solid ${ink}`, boxShadow: '2px 3px 0 rgba(61,40,23,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>🧭</div>
        <div style={{
          position: 'absolute', left: '50%', bottom: -2, transform: 'translateX(-50%)',
          padding: '1px 8px', background: parchment1,
          border: `1.5px solid ${ink}`, borderRadius: 2,
          fontSize: 10, color: ink, fontWeight: 700, fontFamily: 'Georgia, serif',
          whiteSpace: 'nowrap',
        }}>별찌</div>
      </div>

      {/* Status bar */}
      <div style={{ position: 'absolute', top: 21, left: 24, color: ink, fontWeight: 700, fontSize: 17, zIndex: 10, fontFamily: '-apple-system' }}>5:25</div>
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 6, zIndex: 10, color: ink }}>
        <svg width="19" height="12" viewBox="0 0 19 12"><rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="currentColor"/><rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="currentColor"/><rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="currentColor"/><rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="currentColor"/></svg>
        <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" fill="none"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/></svg>
      </div>

      <RightStack tone="light"/>
      <XPBadge tone="light"/>
      <BottomRightFABs tone="light"/>
      <TabBar active="map" tone="light"/>
    </div>
  );
}

function InkStamp({ x, y, emoji, label }) {
  const ink = '#3D2817';
  return (
    <div style={{
      position: 'absolute', left: x - 16, top: y - 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: '#F4E4C1',
        border: `2px solid ${ink}`,
        boxShadow: '1.5px 2px 0 rgba(61,40,23,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
      }}>{emoji}</div>
      <div style={{
        fontSize: 9, color: ink, fontWeight: 700,
        fontFamily: 'Georgia, serif',
        whiteSpace: 'nowrap',
      }}>{label}</div>
    </div>
  );
}

window.GhibliMap = GhibliMap;
