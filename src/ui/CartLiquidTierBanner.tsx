import React from 'react';
import { formatCurrency } from '../lib/currency';
import { unitPriceAtQuantity } from '../lib/liquidUpsell';
import { theme } from './theme';

type Props = {
  liquidQty: number;
  liquidPrices: Record<string, number>;
  discount: number;
};

export const CartLiquidTierBanner: React.FC<Props> = ({ liquidQty, liquidPrices, discount }) => {
  if (liquidQty <= 0) return null;

  const tierOne = Number(liquidPrices['1'] || 18);
  const tierTwo = Number(liquidPrices['2'] || 16);
  const tierThree = Number(liquidPrices['3'] || 15);
  const activeTier = liquidQty >= 3 ? 3 : liquidQty >= 2 ? 2 : 1;
  const currentUnit = unitPriceAtQuantity(liquidQty, liquidPrices);

  return (
    <div className="cart-liquid-tier-banner" style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.lg }}>
      <div className="cart-liquid-tier-banner__inner">
        <div className="cart-liquid-tier-banner__title">Выгода от количества жидкостей</div>
        <div className="cart-liquid-tier-grid">
          <div className={`cart-liquid-tier-chip${activeTier === 1 ? ' cart-liquid-tier-chip--active' : ''}`}>
            <span>1 шт</span>
            <strong>{formatCurrency(tierOne)}</strong>
          </div>
          <div className={`cart-liquid-tier-chip${activeTier === 2 ? ' cart-liquid-tier-chip--active' : ''}`}>
            <span>от 2 шт</span>
            <strong>{formatCurrency(tierTwo)}/шт</strong>
          </div>
          <div className={`cart-liquid-tier-chip${activeTier >= 3 ? ' cart-liquid-tier-chip--active' : ''}`}>
            <span>от 3 шт</span>
            <strong>{formatCurrency(tierThree)}/шт</strong>
          </div>
        </div>
        <div className="cart-liquid-tier-banner__meta">
          Сейчас: {liquidQty} шт · {formatCurrency(currentUnit)}/шт
          {discount > 0 ? ` · экономия ${formatCurrency(discount)}` : activeTier < 3 ? ' · добавьте ещё для лучшей цены' : ' · лучшая цена активна'}
        </div>
      </div>
    </div>
  );
};
