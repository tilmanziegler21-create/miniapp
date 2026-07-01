import React from 'react';
import WebApp from '@twa-dev/sdk';
import { Plus } from 'lucide-react';
import { formatCurrency } from '../lib/currency';
import { getBrandLiquidFlavors, isLiquidCategory } from '../lib/liquidUpsell';
import type { CatalogProduct } from '../store/useCatalogStore';
import type { CartItem } from '../store/useCartStore';
import { theme } from './theme';

type Props = {
  item: CartItem;
  catalog: CatalogProduct[];
  busyId: string | null;
  onAddFlavor: (product: CatalogProduct) => void;
};

export const CartLiquidFlavorPicker: React.FC<Props> = ({ item, catalog, busyId, onAddFlavor }) => {
  if (!isLiquidCategory(item.category)) return null;

  const flavors = getBrandLiquidFlavors(catalog, item.brand || '');
  if (flavors.length <= 1) return null;

  const inCartVariants = new Set(
    catalog
      .filter((p) => String(p.brand) === String(item.brand || ''))
      .map((p) => String(p.id)),
  );

  return (
    <div className="cart-flavor-picker">
      <div className="cart-flavor-picker__label">Все вкусы {item.brand || 'бренда'}</div>
      <div className="cart-flavor-picker__grid">
        {flavors.map((flavor) => {
          const active = String(flavor.id) === String(item.productId);
          return (
            <button
              key={flavor.id}
              type="button"
              className={`cart-flavor-chip${active ? ' cart-flavor-chip--active' : ''}`}
              disabled={busyId === flavor.id || active}
              onClick={() => {
                try { WebApp.HapticFeedback.impactOccurred('light'); } catch { /* ignore */ }
                onAddFlavor(flavor);
              }}
            >
              <span>{flavor.name}</span>
              {!active ? (
                <span className="cart-flavor-chip__add">
                  <Plus size={12} />
                </span>
              ) : (
                <span className="cart-flavor-chip__price">{formatCurrency(flavor.price)}</span>
              )}
            </button>
          );
        })}
      </div>
      {inCartVariants.size > 0 ? (
        <div className="cart-flavor-picker__hint">Нажмите вкус, чтобы добавить ещё одну жидкость в корзину</div>
      ) : null}
    </div>
  );
};
