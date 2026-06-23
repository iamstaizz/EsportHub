import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';

const DISCIPLINES = [
  { key: 'all', label: 'Всі', color: '#a800ff' },
  { key: 'CS2', label: 'CS2', color: '#ff6b35' },
  { key: 'Dota 2', label: 'Dota 2', color: '#00e5ff' },
];

const disciplineColor = (game) => {
  const found = DISCIPLINES.find((d) => d.key === game);
  return found ? found.color : '#a800ff';
};

function FitBounds({ points }) {
  const map = useMap();
  React.useEffect(() => {
    if (points.length > 0) {
      const lats = points.map((p) => parseFloat(p.latitude));
      const lngs = points.map((p) => parseFloat(p.longitude));
      map.flyToBounds(
        [
          [Math.min(...lats) - 5, Math.min(...lngs) - 5],
          [Math.max(...lats) + 5, Math.max(...lngs) + 5],
        ],
        { duration: 0.8 },
      );
    }
  }, [points, map]);
  return null;
}

export default function InteractiveMap({ tournaments = [], onCountryClick, onTournamentClick }) {
  const [activeDiscipline, setActiveDiscipline] = useState('all');

  const filtered = useMemo(
    () =>
      activeDiscipline === 'all'
        ? tournaments
        : tournaments.filter((t) => t.game === activeDiscipline),
    [tournaments, activeDiscipline],
  );

  const mappable = useMemo(
    () => filtered.filter((t) => t.latitude != null && t.longitude != null),
    [filtered],
  );

  return (
    <div style={{ position: 'relative' }}>
      {/* Інлайн CSS фікс білого фону Leaflet саме для твого класу atlas-popup */}
      <style>{`
        .atlas-popup .leaflet-popup-content-wrapper {
          background: #0a0a0a !important;
          border: 1px solid #27272a !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7) !important;
          padding: 4px !important;
        }
        .atlas-popup .leaflet-popup-content {
          margin: 12px !important;
          background: #0a0a0a !important;
          width: auto !important;
        }
        .atlas-popup .leaflet-popup-tip-container {
          margin-top: -1px !important;
        }
        .atlas-popup .leaflet-popup-tip {
          background: #0a0a0a !important;
          border-left: 1px solid #27272a !important;
          border-bottom: 1px solid #27272a !important;
          box-shadow: none !important;
        }
        .atlas-popup .leaflet-popup-close-button {
          color: #a1a1aa !important;
          padding: 10px 10px 0 0 !important;
          font-size: 16px !important;
        }
        .atlas-popup .leaflet-popup-close-button:hover {
          color: #ffffff !important;
          background: transparent !important;
        }
      `}</style>

      <div style={styles.filterBar}>
        <span style={styles.filterLabel}>ДИСЦИПЛІНА</span>
        <div style={styles.filterPills}>
          {DISCIPLINES.map((d) => (
            <button
              key={d.key}
              onClick={() => setActiveDiscipline(d.key)}
              style={{
                ...styles.pill,
                borderColor: d.color,
                background: activeDiscipline === d.key ? d.color : 'transparent',
                color: activeDiscipline === d.key ? '#000' : d.color,
                boxShadow: activeDiscipline === d.key ? `0 0 12px ${d.color}88` : 'none',
              }}
            >
              {d.key !== 'all' && <DisciplineIcon discipline={d.key} size={12} />}
              {d.label}
              {d.key !== 'all' && (
                <span style={styles.pillCount}>
                  {tournaments.filter((t) => t.game === d.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <MapContainer
        center={[20, 10]}
        zoom={2}
        minZoom={2}
        maxZoom={8}
        style={styles.map}
        zoomControl={false}
        worldCopyJump={true}
        attributionControl={false}
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
        />

        {mappable.length > 0 && <FitBounds points={mappable} />}

        {mappable.map((t) => {
          const id = t.id || t.tournament_id;
          const color = disciplineColor(t.game);
          return (
            <CircleMarker
              key={id}
              center={[parseFloat(t.latitude), parseFloat(t.longitude)]}
              radius={8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2,
              }}
              eventHandlers={{
                click: (e) => onTournamentClick && onTournamentClick(e.originalEvent, t),
              }}
            >
              <Popup className="atlas-popup">
                <div style={styles.popup}>
                  <div style={{ ...styles.popupDiscipline, color }}>
                    <DisciplineIcon discipline={t.game} size={11} />
                    {t.game || 'Турнір'}
                  </div>
                  <div style={styles.popupName}>{t.name}</div>
                  <div style={styles.popupLocation}>{t.arena || t.city || '—'}</div>
                  <button
                    style={{ ...styles.popupBtn, borderColor: color, color }}
                    onClick={(e) => onTournamentClick && onTournamentClick(e, t)}
                  >
                    Детальніше →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div style={styles.legend}>
        {DISCIPLINES.filter((d) => d.key !== 'all').map((d) => (
          <div key={d.key} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: d.color }} />
            {d.label}
          </div>
        ))}
      </div>

      {mappable.length === 0 && (
        <div style={styles.emptyOverlay}>
          <p style={{ color: '#555', fontSize: '0.8rem', fontWeight: 600 }}>
            Немає турнірів для цієї дисципліни
          </p>
        </div>
      )}
    </div>
  );
}

function DisciplineIcon({ discipline, size = 14 }) {
  if (discipline === 'CS2') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ flexShrink: 0 }}
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    );
  }
  if (discipline === 'Dota 2') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    );
  }
  return null;
}

const styles = {
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterLabel: {
    color: '#444',
    fontSize: '0.6rem',
    fontWeight: 900,
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  filterPills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  pill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    borderRadius: '20px',
    border: '1px solid',
    background: 'transparent',
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.5px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  pillCount: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '1px 6px',
    fontSize: '0.6rem',
  },
  map: {
    height: '420px',
    width: '100%',
    borderRadius: '14px',
    overflow: 'hidden',
    background: '#04000a',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
    paddingLeft: '4px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#555',
    fontSize: '0.68rem',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  emptyOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    textAlign: 'center',
  },
  popup: {
    background: '#0a0a0a',
    color: '#eee',
    minWidth: '160px',
    fontFamily: 'inherit',
  },
  popupDiscipline: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.6rem',
    fontWeight: 800,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  popupName: {
    fontWeight: 800,
    fontSize: '0.9rem',
    color: '#fff',
    marginBottom: '4px',
    lineHeight: 1.3,
  },
  popupLocation: {
    color: '#555',
    fontSize: '0.72rem',
    marginBottom: '12px',
  },
  popupBtn: {
    background: 'transparent',
    border: '1px solid',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '0.68rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.5px',
    fontFamily: 'inherit',
    width: '100%',
  },
};
