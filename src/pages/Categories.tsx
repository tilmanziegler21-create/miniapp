import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard, theme } from '../ui';
import { useConfigStore } from '../store/useConfigStore';
import { assetUrl } from '../lib/productMedia';

const Categories: React.FC = () => {
  const navigate = useNavigate();
  const config = useConfigStore((state) => state.config);
  const tiles = config?.categoryTiles || [];

  return (
    <div style={{ padding: theme.padding.screen }}>
      <div
        style={{
          textAlign: 'center',
          color: theme.colors.dark.text,
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing.lg,
        }}
      >
        Категории
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
        {!tiles.length ? (
          [...Array(4)].map((_, i) => (
            <GlassCard
              key={i}
              padding="md"
              variant="elevated"
              style={{ height: 140, borderRadius: theme.radius.lg, overflow: 'hidden' }}
            >
              <div style={{ height: 140 }} className="animate-pulse" />
            </GlassCard>
          ))
        ) : tiles.map((t) => (
          <GlassCard
            key={t.slug}
            padding="md"
            variant="elevated"
            style={{
              height: 140,
              borderRadius: theme.radius.lg,
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              border: '1px solid rgba(96,165,250,0.18)',
            }}
            onClick={() => navigate(`/catalog?category=${encodeURIComponent(t.slug)}`)}
          >
            <img
              src={assetUrl(t.imageUrl)}
              alt={t.title}
              loading="lazy"
              decoding="async"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: theme.spacing.md,
              }}
            />
            {t.badgeText ? (
              <div
                style={{
                  position: 'absolute',
                  top: theme.spacing.md,
                  right: theme.spacing.md,
                  background: 'rgba(96,165,250,0.22)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t.badgeText}
              </div>
            ) : null}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 50%, rgba(8,17,31,0.5) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: theme.spacing.md,
                right: theme.spacing.md,
                bottom: theme.spacing.md,
                textAlign: 'center',
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {t.title}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default Categories;
