import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { PageLoader, Spinner } from '../../components/common/UI';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService, favoriteService } from '../../api/services';

const GAMES = [
  { id: 'cs2', name: 'CS2', role: 'Sniper' },
  { id: 'dota2', name: 'Dota 2', role: 'Support' },
  { id: 'lol', name: 'League of Legends', role: 'Mid Laner' },
];

const GameIcon = ({ gameId, size = 18 }) => {
  const style = { width: size, height: size, display: 'inline-block', flexShrink: 0 };
  if (gameId === 'cs2')
    return (
      <svg style={style} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#1a1a2e" />
        <circle cx="16" cy="16" r="7" stroke="#f5a623" strokeWidth="1.5" fill="none" />
        <line
          x1="16"
          y1="6"
          x2="16"
          y2="10"
          stroke="#f5a623"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="16"
          y1="22"
          x2="16"
          y2="26"
          stroke="#f5a623"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="6"
          y1="16"
          x2="10"
          y2="16"
          stroke="#f5a623"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="22"
          y1="16"
          x2="26"
          y2="16"
          stroke="#f5a623"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="2" fill="#f5a623" />
      </svg>
    );
  if (gameId === 'dota2')
    return (
      <svg style={style} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#1a0a0a" />
        <path
          d="M16 5 L24 9 L24 18 Q24 24 16 27 Q8 24 8 18 L8 9 Z"
          stroke="#c8102e"
          strokeWidth="1.5"
          fill="rgba(200,16,46,0.15)"
        />
        <line
          x1="13"
          y1="11"
          x2="19"
          y2="21"
          stroke="#c8102e"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="19"
          y1="11"
          x2="13"
          y2="21"
          stroke="#c8102e"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  if (gameId === 'lol')
    return (
      <svg style={style} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#0a0e1a" />
        <polygon
          points="16,4 26,10 26,22 16,28 6,22 6,10"
          stroke="#c89b3c"
          strokeWidth="1.5"
          fill="rgba(200,155,60,0.1)"
        />
        <path
          d="M12 11 L12 21 L20 21"
          stroke="#c89b3c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  return null;
};

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [favTeams, setFavTeams] = useState([]);
  const [profile, setProfile] = useState({
    nickname: '',
    bio: '',
    game: 'cs2',
    country: 'Ukraine',
  });

  const userId = user?.user_id || user?.userId || user?.id;

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const [profRes, favsRes] = await Promise.all([
          userService.getProfile(userId),
          favoriteService.getTeams(userId),
        ]);
        const d = profRes.data?.data || profRes.data;
        const favs = favsRes.data?.data || favsRes.data || [];

        setProfile({
          nickname: d.username || user?.username || user?.name || 'Гравець',
          bio: localStorage.getItem(`bio_${userId}`) || 'Кіберспортсмен. Завжди в грі.',
          game: localStorage.getItem(`game_${userId}`) || 'cs2',
          country: 'Ukraine',
        });
        setFavTeams(Array.isArray(favs) ? favs : []);
      } catch {
        addToast('Помилка завантаження профілю', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const save = async () => {
    setSaving(true);
    try {
      await userService.updateProfile(userId, { username: profile.nickname });
      localStorage.setItem(`bio_${userId}`, profile.bio);
      localStorage.setItem(`game_${userId}`, profile.game);
      updateUser({ name: profile.nickname });
      addToast('Профіль оновлено!', 'success');
      setEditing(false);
    } catch (e) {
      addToast(e.userMessage || 'Помилка збереження', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeTeam = async (teamId) => {
    try {
      await favoriteService.removeTeam(userId, teamId);
      setFavTeams((p) => p.filter((t) => (t.team_id || t.id) !== teamId));
      addToast('Команду видалено з обраного', 'success');
    } catch (e) {
      addToast(e.userMessage || 'Помилка видалення', 'error');
    }
  };

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      logout?.();
      navigate('/login');
    }, 650);
  };

  if (loading)
    return (
      <PageLayout>
        <PageLoader />
      </PageLayout>
    );

  const game = GAMES.find((g) => g.id === profile.game);

  return (
    <PageLayout>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(168,0,255,.2)} 50%{box-shadow:0 0 36px rgba(168,0,255,.45)} }
        @keyframes logoutFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes logoutRingPulse {
          0% { transform: scale(0.6); opacity: 0; box-shadow: 0 0 0 0 rgba(168,0,255,.55); }
          40% { opacity: 1; }
          100% { transform: scale(1.15); opacity: 0; box-shadow: 0 0 0 30px rgba(168,0,255,0); }
        }
        @keyframes logoutDoorOut {
          0% { transform: translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateX(40px) rotate(8deg); opacity: 0; }
        }
        @keyframes logoutTextRise {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .profile-hero { flex-direction: column !important; align-items: flex-start !important; gap: 1.5rem !important; padding: 2rem !important; }
          .profile-games { flex-wrap: wrap !important; }
          .profile-fav-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .profile-hero { padding: 1.5rem !important; }
          .profile-nickname { font-size: 1.5rem !important; }
        }
      `}</style>
      <div style={{ padding: '2rem 0', animation: 'fadeUp 0.4s ease both' }}>
        {}
        <section
          className="profile-hero"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3rem',
            background: 'linear-gradient(135deg, #0a0a0a, #120021)',
            padding: '3rem',
            borderRadius: 20,
            border: '1px solid #222',
            marginBottom: '3rem',
            position: 'relative',
          }}
        >
          <button
            onClick={handleLogout}
            title="Вийти з акаунту"
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'rgba(255,68,68,0.08)',
              border: '1px solid #3a1414',
              color: '#888',
              padding: '8px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all .2s',
              zIndex: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ff4444';
              e.currentTarget.style.color = '#ff6666';
              e.currentTarget.style.background = 'rgba(255,68,68,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3a1414';
              e.currentTarget.style.color = '#888';
              e.currentTarget.style.background = 'rgba(255,68,68,0.08)';
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Вийти
          </button>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '4px solid #a800ff',
                background: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 900,
                boxShadow: '0 0 20px rgba(168,0,255,.2)',
                animation: 'glowPulse 3s ease-in-out infinite',
              }}
            >
              {profile.nickname[0]?.toUpperCase()}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                background: '#ffcc00',
                color: '#000',
                fontWeight: 900,
                fontSize: '0.65rem',
                padding: '3px 7px',
                borderRadius: 5,
              }}
            >
              PRO
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  value={profile.nickname}
                  onChange={(e) => setProfile((p) => ({ ...p, nickname: e.target.value }))}
                  style={{
                    background: '#000',
                    border: '1px solid #a800ff',
                    color: '#fff',
                    fontSize: '1.4rem',
                    padding: '8px 12px',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: '#555',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Оберіть гру
                  </span>
                  <div className="profile-games" style={{ display: 'flex', gap: 8 }}>
                    {GAMES.map((g) => {
                      const isActive = profile.game === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => setProfile((p) => ({ ...p, game: g.id }))}
                          title={g.name}
                          style={{
                            background: isActive ? 'rgba(168,0,255,.15)' : '#111',
                            border: `1px solid ${isActive ? '#a800ff' : '#333'}`,
                            color: isActive ? '#fff' : '#666',
                            padding: '8px 14px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all .18s',
                            boxShadow: isActive ? '0 0 10px rgba(168,0,255,.25)' : 'none',
                          }}
                        >
                          <GameIcon gameId={g.id} size={18} />
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  style={{
                    background: '#0a0a0a',
                    border: '1px solid #222',
                    color: '#ccc',
                    padding: '10px',
                    borderRadius: 6,
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>
                    {profile.nickname}
                  </h1>
                  <span
                    style={{
                      background: 'rgba(168,0,255,.1)',
                      border: '1px solid #a800ff',
                      color: '#a800ff',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <GameIcon gameId={profile.game} size={16} />
                    {game?.name}
                  </span>
                </div>
                <p style={{ color: '#888', margin: '0 0 12px' }}>{profile.bio}</p>
                <div style={{ display: 'flex', gap: '1.5rem', color: '#555', fontSize: '0.85rem' }}>
                  <span>📍 {profile.country}</span>
                  <span>🎮 {game?.role}</span>
                </div>
              </>
            )}
          </div>

          <div>
            {editing ? (
              <button
                onClick={save}
                disabled={saving}
                style={{
                  background: '#a800ff',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {saving && <Spinner size={14} color="#fff" />}
                Зберегти
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid #a800ff',
                  color: '#a800ff',
                  padding: '10px 20px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Редагувати
              </button>
            )}
          </div>
        </section>

        {}
        <section>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>Обрані команди</h2>
          {favTeams.length === 0 ? (
            <p style={{ color: '#555', fontStyle: 'italic' }}>У вас поки немає обраних команд.</p>
          ) : (
            <div
              className="profile-fav-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem',
              }}
            >
              {favTeams.map((team) => (
                <div
                  key={team.team_id || team.id}
                  style={{
                    background: '#0d0d0d',
                    border: '1px solid #1a1a1a',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        background: '#a800ff',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#fff',
                        fontSize: '1.1rem',
                      }}
                    >
                      {(team.team_name || team.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        {team.team_name || team.name}
                      </div>
                      <div style={{ color: '#a800ff', fontSize: '0.78rem' }}>{team.country}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeTeam(team.team_id || team.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#444',
                      cursor: 'pointer',
                      transition: '.2s',
                      padding: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {loggingOut && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at center, #14001a 0%, #000 80%)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            animation: 'logoutFadeIn 0.25s ease both',
          }}
        >
          <div style={{ position: 'relative', width: 70, height: 70 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(168,0,255,.5)',
                animation: 'logoutRingPulse 1s ease-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px solid #a800ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0d000f',
                animation: 'logoutDoorOut 0.6s ease 0.05s both',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a800ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>
          </div>
          <div
            style={{
              color: '#aaa',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
              animation: 'logoutTextRise 0.4s ease 0.15s both',
            }}
          >
            До зустрічі, {profile.nickname}…
          </div>
        </div>
      )}
    </PageLayout>
  );
}
