import React from 'react';
import { theme } from './theme';

export const ProductCardSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <div
      className="skeleton-shimmer"
      style={{
        aspectRatio: '1 / 1',
        borderRadius: theme.radius.lg,
        border: '1px solid rgba(96,165,250,0.10)',
        background: 'rgba(16,15,18,0.82)',
      }}
    />
    <div
      className="skeleton-shimmer"
      style={{
        marginTop: theme.spacing.md,
        height: 18,
        width: '88%',
        borderRadius: 8,
      }}
    />
    <div
      className="skeleton-shimmer"
      style={{
        marginTop: theme.spacing.sm,
        height: 14,
        width: '55%',
        borderRadius: 8,
      }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.md }}>
      <div className="skeleton-shimmer" style={{ height: 36, width: 72, borderRadius: theme.radius.md }} />
      <div className="skeleton-shimmer" style={{ height: 48, width: 48, borderRadius: theme.radius.md }} />
    </div>
  </div>
);
