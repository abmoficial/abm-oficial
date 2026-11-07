'use client';

import { useState, useEffect } from 'react';

type Item = {
  id: number;
  title: string;
  caption: string;
  image_url: string;
  video_url: string;
  youtube_id: string;
  link_url: string;
};

export default function Carousel({ items }: { items: Item[] }) {
  const [idx, setIdx] = useState(0);
  const n = items.length;

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n]);

  if (!n) return null;
  const cur = items[idx];

  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#0f2e28' }}>
      <div style={{ position: 'relative', aspectRatio: '16/9', maxHeight: 420 }}>
        {cur.youtube_id ? (
          <iframe
            key={cur.youtube_id}
            src={`https://www.youtube.com/embed/${cur.youtube_id}?rel=0`}
            title={cur.title || 'Vídeo'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 0 }}
          />
        ) : cur.image_url ? (
          <img
            src={cur.image_url}
            alt={cur.title || 'Galeria'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '3rem',
            }}
          >
            🎬
          </div>
        )}

        {(cur.title || cur.caption) && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '28px 24px 20px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
              color: 'white',
            }}
          >
            {cur.title && (
              <h3 style={{ fontSize: '1.25rem', marginBottom: 4 }}>{cur.title}</h3>
            )}
            {cur.caption && (
              <p style={{ opacity: 0.85, fontSize: '0.95rem' }}>{cur.caption}</p>
            )}
          </div>
        )}
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => setIdx((i) => (i - 1 + n) % n)}
            style={navBtnStyle('left')}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => setIdx((i) => (i + 1) % n)}
            style={navBtnStyle('right')}
          >
            ›
          </button>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 0',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIdx(i)}
                style={{
                  width: i === idx ? 22 : 8,
                  height: 8,
                  borderRadius: 99,
                  border: 0,
                  background: i === idx ? '#c9a227' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function navBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute',
    top: '40%',
    [side]: 12,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 0,
    background: 'rgba(255,255,255,0.9)',
    color: '#0f2e28',
    fontSize: 24,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    zIndex: 2,
  };
}
