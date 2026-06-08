import React from 'react';
import { theme } from './theme';
import { Star, TrendingUp } from 'lucide-react';

interface TrustIndicatorsProps {
  rating: number; // 1-5
  reviewCount: number;
  weeklyOrders: number;
  showReviewButton?: boolean;
  onReviewClick?: () => void;
  size?: 'sm' | 'md';
}

export const TrustIndicators: React.FC<TrustIndicatorsProps> = ({
  rating,
  reviewCount,
  weeklyOrders,
  showReviewButton = false,
  onReviewClick,
  size = 'md',
}) => {
  const isSmall = size === 'sm';
  
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: isSmall ? 4 : 8,
      padding: isSmall ? '8px' : '12px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: theme.radius.md,
      border: '1px solid rgba(255,255,255,0.1)',
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    indicator: {
      display: 'flex',
      alignItems: 'center',
      gap: isSmall ? 4 : 6,
    },
    icon: {
      width: isSmall ? 14 : 16,
      height: isSmall ? 14 : 16,
      color: theme.colors.dark.primary,
    },
    text: {
      fontSize: isSmall ? theme.typography.fontSize.xs : theme.typography.fontSize.sm,
      color: theme.colors.dark.textSecondary,
    },
    ratingText: {
      fontSize: isSmall ? theme.typography.fontSize.sm : theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.dark.primary,
    },
    reviewButton: {
      background: 'linear-gradient(135deg, rgba(96,165,250,0.16) 0%, rgba(30,64,175,0.14) 100%)',
      border: '1px solid rgba(96,165,250,0.24)',
      borderRadius: theme.radius.sm,
      padding: '4px 8px',
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.dark.primary,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    stars: {
      display: 'flex',
      gap: '2px',
    },
    star: {
      width: isSmall ? 12 : 14,
      height: isSmall ? 12 : 14,
      color: theme.colors.dark.primary,
    },
    starEmpty: {
      color: 'rgba(255,255,255,0.2)',
    },
  };

  const renderStars = () => {
    return (
      <div style={styles.stars}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={isSmall ? 12 : 14}
            style={{
              ...styles.star,
              ...(i >= Math.floor(rating) ? styles.starEmpty : {}),
            }}
            fill={i < Math.floor(rating) ? theme.colors.dark.primary : 'none'}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Rating */}
      <div style={styles.row}>
        <div style={styles.indicator}>
          {renderStars()}
          <span style={styles.ratingText}>{rating.toFixed(1)}</span>
        </div>
        <span style={styles.text}>({reviewCount} оценок)</span>
      </div>

      {/* Weekly Orders */}
      <div style={styles.row}>
        <div style={styles.indicator}>
          <TrendingUp size={isSmall ? 14 : 16} style={styles.icon} />
          <span style={styles.text}>Заказов за неделю</span>
        </div>
        <span style={styles.text}>{weeklyOrders}</span>
      </div>

      {/* Review Button */}
      {showReviewButton && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <button
            style={styles.reviewButton}
            onClick={onReviewClick}
          >
            Оценить товар
          </button>
        </div>
      )}
    </div>
  );
};
