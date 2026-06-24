import React, { useState, useEffect } from 'react';
import InteractiveMap from './InteractiveMap';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { PageLoader, ErrorState } from '../../components/common/UI';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { matchService, tournamentService, countryService } from '../../api/services';
import styles from './Dashboard.module.css';

function MatchStatusBadge({ status }) {
  const cfg = {
    live: { label: '● LIVE', bg: 'var(--danger)', color: '#fff' },
    upcoming: { label: 'НЕЗАБАРОМ', bg: 'var(--bg-surface)', color: 'var(--accent)' },
    finished: { label: 'ЗАВЕРШЕНО', bg: 'var(--bg-elevated)', color: 'var(--text-disabled)' },
  };
  const s = cfg[status] || cfg.upcoming;
  return (
    <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function MatchCard({ match, isSubbed, onNavigate, onReminder }) {
  const t1 =
    match.team1_name ||
    (typeof match.team1 === 'object' ? match.team1?.name : match.team1) ||
    'TBD';
  const t2 =
    match.team2_name ||
    (typeof match.team2 === 'object' ? match.team2?.name : match.team2) ||
    'TBD';
  const status = match.status || 'upcoming';
  const isLive = status === 'live';
  const isFinished = status === 'finished';
  const score1 = match.score_team1 ?? match.scoreTeam1;
  const score2 = match.score_team2 ?? match.scoreTeam2;
  const showScore = isLive || isFinished;
  const time = match.start_time
    ? new Date(match.start_time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      onClick={onNavigate}
      className={`${styles.matchCard} ${isLive ? styles.matchCardLive : ''}`}
    >
      {isLive && <div className={styles.matchLiveBar} />}

      <div style={{ flex: 1, textAlign: 'right' }}>
        <div className={styles.teamName}>{t1}</div>
        {time && !showScore && <div className={styles.matchTime}>{time}</div>}
      </div>

      <div style={{ textAlign: 'center', minWidth: '64px' }}>
        {showScore ? (
          <div className={`${styles.scoreLabel} ${isFinished ? styles.scoreLabelFinished : ''}`}>
            {score1} <span className={styles.scoreSeparator}>:</span> {score2}
          </div>
        ) : (
          <div className={styles.vsLabel}>VS</div>
        )}
        <div style={{ marginTop: '4px' }}>
          <MatchStatusBadge status={status} />
        </div>
      </div>

      <div style={{ flex: 1, textAlign: 'left' }}>
        <div className={styles.teamName}>{t2}</div>
        {time && !showScore && <div className={styles.matchTime}>{time}</div>}
      </div>

      <button
        onClick={onReminder}
        title={isSubbed ? 'Скасувати нагадування' : 'Додати нагадування'}
        className={styles.reminderBtn}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isSubbed ? 'var(--accent)' : 'none'}
          stroke={isSubbed ? 'var(--accent)' : 'var(--border-strong)'}
          strokeWidth="2.5"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </button>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryTeams, setCountryTeams] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState({});
  const [tournaments, setTournaments] = useState([]);

  const currentUserId = user?.userId || user?.user_id || user?.id;
  const displayName = user?.username || 's1mple';

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = () => {
    setLoading(true);
    matchService
      .getAll()
      .then((r) => {
        setMatches(r.data?.data || r.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    tournamentService
      .getForMap()
      .then((r) => {
        const raw = r.data;
        let data = [];
        if (Array.isArray(raw)) data = raw;
        else if (Array.isArray(raw?.data)) data = raw.data;
        else if (Array.isArray(raw?.tournaments)) data = raw.tournaments;
        setTournaments(data);
      })
      .catch((err) => console.error('Tournaments load error:', err));
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    matchService
      .getSubscriptions(currentUserId)
      .then((r) => {
        const d = r.data?.data || r.data || [];
        const map = {};
        d.forEach((s) => {
          const mId = s.match_id || s.matchId || s.id;
          if (mId) map[mId] = true;
        });
        setSubscriptions(map);
      })
      .catch((err) => console.error('Subscriptions load error:', err));
  }, [currentUserId]);

  const handleCountryClick = async (id, name) => {
    setSidebarType('country');
    setSelectedCountry({ id, name });
    setSelectedTournament(null);
    setIsSidebarOpen(true);
    try {
      const r = await countryService.getTeamsByCountry(id);
      setCountryTeams(r.data?.data || r.data || []);
    } catch {
      addToast('Не вдалося завантажити команди', 'error');
    }
  };

  const handleTournamentClick = (e, tournament) => {
    if (e?.stopPropagation) e.stopPropagation();
    setSidebarType('tournament');
    setSelectedTournament(tournament);
    setSelectedCountry(null);
    setIsSidebarOpen(true);
  };

  const getTeamName = (m, n) => {
    if (n === 1)
      return m.team1_name || (typeof m.team1 === 'object' ? m.team1?.name : m.team1) || 'TBD';
    return m.team2_name || (typeof m.team2 === 'object' ? m.team2?.name : m.team2) || 'TBD';
  };

  const handleReminder = async (e, match) => {
    e.stopPropagation();
    if (!currentUserId) {
      addToast('Будь ласка, увійдіть в акаунт', 'warning');
      return;
    }
    const mId = match.matchId || match.match_id || match.id;
    const isSub = !!subscriptions[mId];
    try {
      if (isSub) {
        await matchService.unsubscribe(currentUserId, mId);
        setSubscriptions((p) => {
          const n = { ...p };
          delete n[mId];
          return n;
        });
        addToast('Нагадування скасовано', 'info');
      } else {
        await matchService.subscribe(currentUserId, mId);
        setSubscriptions((p) => ({ ...p, [mId]: true }));
        setNotifications((prev) => [
          {
            id: Date.now(),
            message: `Ви підписались на матч ${getTeamName(match, 1)} vs ${getTeamName(match, 2)}`,
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev,
        ]);
        addToast('Ви підписалися на матч!', 'success');
      }
    } catch {
      addToast('Помилка підписки', 'error');
    }
  };

  const allMatches = matches || [];
  const filteredMatches = allMatches.filter((m) => {
    const t1 = getTeamName(m, 1).toLowerCase();
    const t2 = getTeamName(m, 2).toLowerCase();
    return t1.includes(search.toLowerCase()) || t2.includes(search.toLowerCase());
  });
  const sortedTop = [...filteredMatches].sort((a, b) => {
    const order = { live: 0, upcoming: 1, finished: 2 };
    return (order[a.status] ?? 1) - (order[b.status] ?? 1);
  });
  const topMatches = sortedTop.slice(0, 5);
  const hasMore = filteredMatches.length > 5;

  const HeaderNotificationBell = (
    <div
      style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      onClick={() => setIsNotifOpen(!isNotifOpen)}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={notifications.length > 0 ? 'var(--accent)' : 'var(--text-dim)'}
        strokeWidth="2"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {notifications.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'var(--danger)',
            color: '#fff',
            fontSize: '9px',
            width: '15px',
            height: '15px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          {notifications.length}
        </div>
      )}
      {isNotifOpen && (
        <div className={styles.notifPanel}>
          <div className={styles.notifHeader}>ЦЕНТР СПОВІЩЕНЬ</div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className={styles.notifEmpty}>Немає нових сповіщень</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={styles.notifItem}>
                  <p className={styles.notifMessage}>{n.message}</p>
                  <span className={styles.notifTime}>{n.created_at}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (loading && !matches)
    return (
      <PageLayout>
        <PageLoader />
      </PageLayout>
    );

  return (
    <PageLayout customHeaderActions={HeaderNotificationBell}>
      <div className={styles.page}>
        <div className={styles.welcomeBlock}>
          <h1 className={styles.welcomeTitle}>
            Вітаємо, гравець <span style={{ color: 'var(--accent)' }}>{displayName}</span>
          </h1>
          <p className={styles.welcomeSubtitle}>Твій центр кіберспортивної активності на сьогодні.</p>
        </div>

        <div className={styles.contentGrid}>
          <section>
            <div className={styles.sectionHeaderRow}>
              <div className={styles.sectionHeaderLeft}>
                <h2 className={styles.sectionLabel}>МАТЧІ СЬОГОДНІ</h2>
                {allMatches.some((m) => m.status === 'live') && (
                  <span
                    className={styles.statusBadge}
                    style={{ background: 'var(--danger)', color: '#fff', animation: 'pulse 2s infinite' }}
                  >
                    ● LIVE
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="ПОШУК..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {error && <ErrorState message={error} onRetry={refetch} />}

            <div className={styles.matchList}>
              {topMatches.length === 0 && !loading && (
                <div className={styles.emptyState}>Матчів не знайдено</div>
              )}
              {topMatches.map((m) => {
                const mId = m.matchId || m.match_id || m.id;
                return (
                  <MatchCard
                    key={mId}
                    match={m}
                    isSubbed={!!subscriptions[mId]}
                    onNavigate={() => navigate(`/match/${mId}`)}
                    onReminder={(e) => handleReminder(e, m)}
                  />
                );
              })}
            </div>

            <button onClick={() => navigate('/matches')} className={styles.viewAllBtn}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
              </svg>
              Дивитися всі матчі
              {hasMore && <span className={styles.viewAllCount}>+{filteredMatches.length - 5}</span>}
            </button>
          </section>

          <section>
            <h2 className={styles.sectionLabel} style={{ marginBottom: '20px' }}>
              ГЛОБАЛЬНА АРЕНА
            </h2>
            <div className={styles.mapPanel}>
              <InteractiveMap
                tournaments={tournaments}
                onCountryClick={handleCountryClick}
                onTournamentClick={handleTournamentClick}
              />
            </div>
          </section>
        </div>

        <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeaderRow}>
            <h3 className={styles.sidebarTitle}>
              {sidebarType === 'country' ? selectedCountry?.name?.toUpperCase() : 'LAN TOURNAMENT'}
            </h3>
            <button onClick={() => setIsSidebarOpen(false)} className={styles.sidebarCloseBtn}>
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sidebarType === 'country' &&
              countryTeams.map((t) => (
                <div key={t.id || t.team_id} className={styles.sidebarTeamItem}>
                  {t.name.toUpperCase()}
                </div>
              ))}

            {sidebarType === 'tournament' && selectedTournament && (
              <div style={{ color: 'var(--text-secondary)' }}>
                <h4 style={{ color: 'var(--accent)', fontSize: '1.2rem', marginBottom: '25px', fontWeight: 800 }}>
                  {selectedTournament.name}
                </h4>
                {[
                  { label: 'ЛОКАЦІЯ', value: selectedTournament.arena || selectedTournament.city },
                  {
                    label: 'ДИСЦИПЛІНА',
                    value: selectedTournament.game,
                    color: selectedTournament.game === 'CS2' ? '#ff6b35' : '#00e5ff',
                  },
                  {
                    label: 'ПРИЗОВИЙ ФОНД',
                    value: `$${Number(selectedTournament.prize_pool).toLocaleString()}`,
                    color: 'var(--accent)',
                  },
                  {
                    label: 'ДАТИ',
                    value: `${selectedTournament.start_date} → ${selectedTournament.end_date}`,
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className={styles.sidebarDetailCard}>
                    <span className={styles.sidebarDetailLabel}>{label}</span>
                    <span className={styles.sidebarDetailValue} style={color ? { color } : undefined}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
