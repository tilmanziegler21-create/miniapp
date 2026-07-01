import React from 'react';
import { Plus } from 'lucide-react';
import { GlassCard, theme } from './index';
import { formatCurrency } from '../lib/currency';
import type { CatalogProduct } from '../store/useCatalogStore';
import type { LiquidUpsellStage } from '../lib/liquidUpsell';

type Props = {
  products: CatalogProduct[];
  stage: LiquidUpsellStage | null;
  busyId: string | null;
  onAdd: (product: CatalogProduct) => void;
};

export const CartLiquidUpsell: React.FC<Props> = ({ products, stage, busyId, onAdd }) => {
  if (!products.length || !stage) return null;

  return (
    <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.lg }}>
      <GlassCard padding="lg" variant="elevated" className={`cart-upsell-card cart-upsell-card--${stage.animation}`}>
        <div className="cart-upsell-card__badge">Выгодное предложение</div>
        <div style={{ color: theme.colors.dark.text, fontWeight: theme.typography.fontWeight.bold, fontSize: theme.typography.fontSize.lg, marginBottom: 6 }}>
          {stage.title}
        </div>
        <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.md, lineHeight: 1.45 }}>
          {stage.subtitle}
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
