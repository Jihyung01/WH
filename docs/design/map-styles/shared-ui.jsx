// Shared UI overlays used across all 5 map styles
// Kept consistent so the user can compare just the map illustration treatment.

function RightStack({ tone = 'light' }) {
  const dark = tone === 'dark';
  const bg = dark ? 'rgba(20,25,45,0.75)' : 'rgba(255,255,255,0.95)';
  const border = dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.04)';
  const fg = dark ? '#E8EEFF' : '#222';
  const btn = (children) => (
    <div style={{
      width: 48, height: 48, borderRadius: 24,
      background: bg, border, backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
      color: fg,
    }}>{children}</div>
  );
  return (
    <div style={{
      position: 'absolute', top: 78, right: 12, zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {btn(
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/>
          <path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><path d="M14 17c0-2 2-3 3-3s3 1 3 3"/>
        </svg>
      )}
      {btn(
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10 21a2 2 0 004 0"/>
        </svg>
      )}
      {btn(
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/>
          <line x1="9" y1="18" x2="15" y2="18"/>
        </svg>
      )}
    </div>
  );
}

function XPBadge({ tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div style={{
      position: 'absolute', top: 78, left: 14, zIndex: 10,
      width: 64, height: 64, borderRadius: 32,
      background: dark
        ? 'radial-gradient(circle at 30% 30%, rgba(61,220,151,0.25), rgba(20,25,45,0.85))'
        : 'rgba(255,255,255,0.95)',
      border: '2px solid #3DDC97',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: dark ? '0 0 18px rgba(61,220,151,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
      position: 'absolute',
    }}>
      <span style={{ fontSize: 28 }}>⭐</span>
      <div style={{
        position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
        background: '#3DDC97', color: '#0A0E27',
        fontSize: 11, fontWeight: 700,
        padding: '1px 8px', borderRadius: 10, letterSpacing: -0.2,
      }}>20</div>
    </div>
  );
}

function BottomRightFABs({ tone = 'light' }) {
  const dark = tone === 'dark';
  return (
    <div style={{
      position: 'absolute', bottom: 110, right: 16, zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Add event / 흔적 남기기 */}
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: 'linear-gradient(135deg, #3DDC97 0%, #1A8A5A 100%)',
        boxShadow: dark
          ? '0 0 24px rgba(61,220,151,0.55), 0 4px 12px rgba(0,0,0,0.4)'
          : '0 6px 20px rgba(61,220,151,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5l4 4L8 20H4v-4L16.5 3.5z"/>
        </svg>
      </div>
      {/* Locate me */}
      <div style={{
        width: 48, height: 48, borderRadius: 24,
        background: dark ? 'rgba(20,25,45,0.85)' : 'rgba(255,255,255,0.95)',
        border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.04)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.08)',
        color: dark ? '#E8EEFF' : '#222',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2 L 14 11 L 22 13 L 14 13.5 L 12 22 L 10 13.5 L 2 13 L 10 11 Z" transform="rotate(45 12 12)"/>
        </svg>
      </div>
    </div>
  );
}

function TabBar({ active = 'map', tone = 'light' }) {
  const dark = tone === 'dark';
  const items = [
    { k: 'map', label: '지도', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/>
        <path d="M9 4v16M15 6v16"/>
      </svg>
    ) },
    { k: 'feed', label: '피드', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>
      </svg>
    ) },
    { k: 'social', label: '소셜', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2.5"/>
        <path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><path d="M14 17c0-2 2-3 3-3s3 1 3 3"/>
      </svg>
    ) },
    { k: 'char', label: '캐릭터', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 2l1.5 5.5L19 9l-4 4 1 6-4-3-4 3 1-6-4-4 5.5-1.5L12 2z"/>
      </svg>
    ) },
    { k: 'profile', label: '프로필', icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
      </svg>
    ) },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
      paddingBottom: 24, paddingTop: 8,
      background: dark
        ? 'linear-gradient(to top, rgba(5,8,23,0.95), rgba(5,8,23,0.85) 60%, rgba(5,8,23,0))'
        : 'linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0.6) 70%, rgba(255,255,255,0))',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 4px' }}>
        {items.map(it => {
          const on = it.k === active;
          const c = on ? '#3DDC97' : (dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)');
          return (
            <div key={it.k} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: c, padding: '4px 10px',
            }}>
              {it.icon}
              <div style={{ fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: -0.2 }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { RightStack, XPBadge, BottomRightFABs, TabBar });
