import React from 'react';
import WebApp from '@twa-dev/sdk';
import { Plus } from 'lucide-react';
import { formatCurrency } from '../lib/currency';
import { getBrandLiquidFlavors, isLiquidCategory } from '../lib/liquidUpsell';
import type { CatalogProduct } from '../store/useCatalogStore';
import type { CartItem } from '../store/useCartStore';
import { FlavorSelectField } from './FlavorSelectField';

type Props = {
  item: CartItem;
  catalog: CatalogProduct[];
  busyId: string | null;
  onAddFlavor: (product: CatalogProduct) => void;
};

export const CartLiquidFlavorPicker: React.FC<Props> = ({ item, catalog, busyId, onAddFlavor }) => {
  const [selectedId, setSelectedId] = React.useState('');

  if (!isLiquidCategory(item.category)) return null;

  const flavors = getBrandLiquidFlavors(catalog, item.brand || '');
  if (flavors.length <= 1) return null;

  const available = flavors.filter((f) => String(f.id) !== String(item.productId));
  if (!available.length) return null;

  const pickId = selectedId || String(available[0].id);
  const selected = available.find((f) => String(f.id) === pickId) || available[0];

  return (
    <div className="cart-flavor-picker">
      <FlavorSelectField
        label={`Добавить другой вкус ${item.brand || 'бренда'}`}
        hint="Нажмите, чтобы открыть список"
        value={pickId}
        onChange={setSelectedId}
        options={available.map((flavor) => ({
          id: String(flavor.id),
          label: `${flavor.name} — ${formatCurrency(flavor.price)}`,
        }))}
      />
      <button
        type="button"
        className="cart-flavor-picker__add-inline"
        disabled={busyId === selected.id}
        onClick={() => {
          try { WebApp.HapticFeedback.impactOccurred('light'); } catch { /* ignore */ }
          onAddFlavor(selected);
        }}
        aria-label={`Добавить ${selected.name}`}
      >
        <Plus size={14} />
        <span>Добавить</span>
      </button>
    </div>
  );
};
