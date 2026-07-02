import React from 'react';
import { Plus } from 'lucide-react';
import { GlassCard, theme, FlavorSelectField } from './index';
import { formatCurrency } from '../lib/currency';
import { getBrandLiquidFlavors } from '../lib/liquidUpsell';
import type { CatalogProduct } from '../store/useCatalogStore';
import type { LiquidUpsellStage } from '../lib/liquidUpsell';

type Props = {
  products: CatalogProduct[];
  catalog: CatalogProduct[];
  stage: LiquidUpsellStage | null;
  busyId: string | null;
  onAdd: (product: CatalogProduct, event?: React.MouseEvent<HTMLButtonElement>) => void;
};

export const CartLiquidUpsell: React.FC<Props> = ({ products, catalog, stage, busyId, onAdd }) => {
  const [selectedByBrand, setSelectedByBrand] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const next: Record<string, string> = {};
    for (const product of products) {
      const brand = String(product.brand || 'Другие');
      next[brand] = next[brand] || String(product.id);
    }
    if (Object.keys(next).length) {
      setSelectedByBrand((prev) => ({ ...next, ...prev }));
    }
  }, [products]);

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
        <div style={{ fontSize: 12, color: theme.colors.dark.textSecondary, marginBottom: theme.spacing.sm }}>
          Другие бренды жидкостей — выберите вкус и добавьте в корзину
        </div>
        <div style={{ display: 'grid', gap: theme.spacing.sm }}>
          {products.map((product) => {
            const brand = String(product.brand || 'Другие');
            const flavors = getBrandLiquidFlavors(catalog, brand);
            const selectedId = selectedByBrand[brand] || String(product.id);
            const selected = flavors.find((f) => String(f.id) === selectedId) || product;

            return (
              <div key={brand} className="cart-upsell-row cart-upsell-row--select">
                <div className="cart-upsell-row__brand">{brand}</div>
                <FlavorSelectField
                  label="Вкус"
                  hint=""
                  value={selectedId}
                  onChange={(value) => setSelectedByBrand((prev) => ({ ...prev, [brand]: value }))}
                  options={flavors.map((flavor) => ({
                    id: String(flavor.id),
                    label: `${flavor.name} — ${formatCurrency(flavor.price)}`,
                  }))}
                />
                <button
                  type="button"
                  className="cart-upsell-row__add"
                  onClick={(e) => onAdd(selected, e)}
                  disabled={busyId === selected.id}
                  aria-label={`Добавить ${selected.name}`}
                >
                  <Plus size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
};
