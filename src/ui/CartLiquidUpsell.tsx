import React from 'react';
import { Plus } from 'lucide-react';
import { GlassCard, theme } from './index';
import { formatCurrency } from '../lib/currency';
import type { CatalogProduct } from '../store/useCatalogStore';

type Props = {
  products: CatalogProduct[];
  bundleHint: string | null;
  busyId: string | null;
  onAdd: (product: CatalogProduct) => void;
};

export const CartLiquidUpsell: React.FC<Props> = ({ products, bundleHint, busyId, onAdd }) => {
  if (!products.length) return null;

  return (
    <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.lg }}>
      <GlassCard padding="lg" variant="elevated">
        <div
          style={{
            fontSize: theme.typography.fontSize.xs,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: theme.colors.dark.primary,
            marginBottom: theme.spacing.sm,
          }}
        >
          Сэкономьте на жидкостях
        </div>
        <div style={{ color: theme.colors.dark.text, fontWeight: theme.typography.fontWeight.semibold, marginBottom: 6 }}>
          Возьмите ещё одну к своей
        </div>
        <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.md, lineHeight: 1.45 }}>
          {bundleHint
            ? `При 2 шт по таблице цен: ${bundleHint}`
            : 'Добавьте ещё жидкость — выгоднее по таблице цен'}
        </div>
        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              className="cart-upsell-row"
              onClick={() => onAdd(product)}
              disabled={busyId === product.id}
            >
              <span className="cart-upsell-row__name">{product.name}</span>
              <span className="cart-upsell-row__price">{formatCurrency(product.price)}</span>
              <span className="cart-upsell-row__action">
                <Plus size={16} />
              </span>
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
