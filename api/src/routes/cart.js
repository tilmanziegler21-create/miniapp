import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../services/database.js';
import { getProducts, getLiquidPrices } from '../services/sheets.js';

const router = express.Router();

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { tgId } = req.user;
    const { city } = req.query;
    
    if (!city) {
      return res.status(400).json({ error: 'City parameter is required' });
    }

    let cart = db.prepare('SELECT * FROM carts WHERE user_id = ? AND city = ?').get(tgId, city);
    
    if (!cart) {
      const cartId = generateId();
      const newCart = {
        id: cartId,
        user_id: tgId,
        city,
        items: [],
        total: 0
      };
      db.carts.set(cartId, newCart);
      cart = newCart;
    }

    const products = await getProducts(String(city));
    const bySku = new Map(products.map((p) => [String(p.sku), p]));

    const items = [];
    for (const item of db.cartItems.values()) {
      if (item.cart_id !== cart.id) continue;
      const p = bySku.get(String(item.product_id));
      items.push({
        ...item,
        name: p?.name || 'Товар',
        category: p?.category || '',
        brand: p?.brand || '',
        product_price: Number(p?.price || item.price || 0),
        image: p?.image || '',
      });
    }

    let subtotal = 0;
    let quantityDiscount = 0;

    let totalLiquidsQty = 0;
    let totalLiquidsBasePrice = 0;
    
    items.forEach(item => {
      const isLiquid = item.category === 'liquids' || item.category === 'Жидкости';
      if (isLiquid) {
        totalLiquidsQty += Number(item.quantity || 0);
        totalLiquidsBasePrice += Number(item.quantity || 0) * Number(item.product_price || item.price || 0);
      }
    });

    let liquidsFinalPrice = 0;
    const dynamicLiquidPrices = await getLiquidPrices(String(city));
    
    if (dynamicLiquidPrices && totalLiquidsQty > 0) {
      if (dynamicLiquidPrices[totalLiquidsQty]) {
        liquidsFinalPrice = dynamicLiquidPrices[totalLiquidsQty];
      } else {
        const maxQty = Math.max(...Object.keys(dynamicLiquidPrices).map(Number));
        if (totalLiquidsQty > maxQty) {
          const extraPrice = dynamicLiquidPrices['extra'] || 14; // fallback to 14
          liquidsFinalPrice = dynamicLiquidPrices[maxQty] + (totalLiquidsQty - maxQty) * extraPrice;
        } else {
          // fallback to base price if no matching tier and not exceeding max
          liquidsFinalPrice = totalLiquidsBasePrice;
        }
      }
    } else {
      // Fallback logic if liquidprices table is missing
      if (totalLiquidsQty === 1) liquidsFinalPrice = 18;
      else if (totalLiquidsQty === 2) liquidsFinalPrice = 32;
      else if (totalLiquidsQty === 3) liquidsFinalPrice = 45;
      else if (totalLiquidsQty > 3) liquidsFinalPrice = 45 + (totalLiquidsQty - 3) * 14;
    }

    const totalLiquidsDiscount = totalLiquidsQty > 0 ? Math.max(0, totalLiquidsBasePrice - liquidsFinalPrice) : 0;
    let appliedLiquidsDiscount = 0;

    const mappedItems = items.map(item => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.product_price || item.price || 0);
      const isLiquid = item.category === 'liquids' || item.category === 'Жидкости';
      
      let effectivePrice = price;
      let lineSubtotal = price * qty;
      let lineTotal = lineSubtotal;

      // Distribute liquids discount proportionally
      if (isLiquid && totalLiquidsBasePrice > 0) {
        const itemShare = lineSubtotal / totalLiquidsBasePrice;
        const itemDiscount = totalLiquidsDiscount * itemShare;
        lineTotal = Math.max(0, lineSubtotal - itemDiscount);
        effectivePrice = qty > 0 ? lineTotal / qty : 0;
        appliedLiquidsDiscount += itemDiscount;
      } else {
        // Fallback to old logic for non-liquids
        effectivePrice = qty >= 3 && price > 40 ? 40 : price;
        lineTotal = effectivePrice * qty;
        quantityDiscount += Math.max(0, lineSubtotal - lineTotal);
      }

      subtotal += lineSubtotal;
      
      return {
        id: item.id,
        productId: item.product_id,
        variant: item.variant || '',
        name: item.name,
        category: item.category,
        brand: item.brand,
        price,
        effectivePrice,
        quantity: qty,
        image: item.image,
        total: lineTotal,
      };
    });

    quantityDiscount += appliedLiquidsDiscount;

    const discount = Math.round(quantityDiscount * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    res.json({
      cart: {
        id: cart.id,
        city: cart.city,
        items: mappedItems,
        pricing: {
          subtotal: Math.round(subtotal * 100) / 100,
          discount,
          total,
        },
        total,
      }
    });
  } catch (error) {
    console.error('Cart fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

router.post('/add', requireAuth, async (req, res) => {
  try {
    const { tgId } = req.user;
    const { productId, quantity = 1, city, variant } = req.body;
    
    if (!productId || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const qty = Number(quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const products = await getProducts(String(city));
    const p = products.find((x) => String(x.sku) === String(productId));
    if (!p || !p.active) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const reserved = db.getActiveReservationsByProduct(String(productId)).reduce((s, r) => s + r.qty, 0);
    const available = Number(p.stock) - reserved;
    if (available <= 0) {
      return res.status(409).json({ error: 'Out of stock' });
    }
    if (qty > available) {
      return res.status(409).json({ error: 'Insufficient stock' });
    }

    let cart = db.prepare('SELECT * FROM carts WHERE user_id = ? AND city = ?').get(tgId, city);
    
    if (!cart) {
      const cartId = generateId();
      const newCart = {
        id: cartId,
        user_id: tgId,
        city,
        items: [],
        total: 0
      };
      db.carts.set(cartId, newCart);
      cart = newCart;
    }

    const normalizedVariant = variant ? String(variant) : '';
    const existingItem = Array.from(db.cartItems.values()).find(
      (item) =>
        String(item.cart_id) === String(cart.id) &&
        String(item.product_id) === String(productId) &&
        String(item.variant || '') === normalizedVariant,
    );

    let itemId = '';
    if (existingItem) {
      existingItem.quantity = Number(existingItem.quantity || 0) + qty;
      existingItem.price = Number(p.price);
      db.cartItems.set(existingItem.id, existingItem);
      itemId = String(existingItem.id);
    } else {
      itemId = generateId();
      const newItem = {
        id: itemId,
        cart_id: cart.id,
        product_id: productId,
        variant: normalizedVariant,
        quantity: qty,
        price: Number(p.price)
      };
      db.cartItems.set(itemId, newItem);
    }
    res.json({ success: true, message: 'Product added to cart' });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

router.post('/remove', requireAuth, (req, res) => {
  try {
    const { tgId } = req.user;
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    const item = db.cartItems.get(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const cart = db.carts.get(String(item.cart_id));
    if (!cart || String(cart.user_id) !== String(tgId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    db.cartItems.delete(itemId);
    
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

router.post('/update', requireAuth, async (req, res) => {
  try {
    const { tgId } = req.user;
    const { itemId, quantity } = req.body;
    if (!itemId) return res.status(400).json({ error: 'Item ID is required' });
    const qty = Number(quantity || 0);
    if (!Number.isFinite(qty)) return res.status(400).json({ error: 'Invalid quantity' });

    const item = db.cartItems.get(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const cart = db.carts.get(String(item.cart_id));
    if (!cart || String(cart.user_id) !== String(tgId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (qty <= 0) {
      db.cartItems.delete(itemId);
      return res.json({ success: true });
    }

    const city = String(cart?.city || '').trim();
    if (!city) return res.status(400).json({ error: 'City is required' });

    const products = await getProducts(city);
    const p = products.find((x) => String(x.sku) === String(item.product_id));
    if (!p || !p.active) return res.status(404).json({ error: 'Product not found' });
    const reserved = db.getActiveReservationsByProduct(String(item.product_id)).reduce((s, r) => s + r.qty, 0);
    const available = Number(p.stock) - reserved;
    if (qty > available) return res.status(409).json({ error: 'Insufficient stock' });

    item.quantity = qty;
    db.cartItems.set(itemId, item);
    return res.json({ success: true });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

router.post('/clear', requireAuth, (req, res) => {
  try {
    const { tgId } = req.user;
    const { city } = req.body;
    if (!city) return res.status(400).json({ error: 'City is required' });

    const cart = db.prepare('SELECT * FROM carts WHERE user_id = ? AND city = ?').get(tgId, city);
    if (!cart) return res.json({ success: true });

    for (const [id, item] of db.cartItems.entries()) {
      if (item.cart_id === cart.id) db.cartItems.delete(id);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Clear cart error:', e);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
