import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../services/database.js';

export const verifyTelegramAuth = (req, res, next) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(401).json({ error: 'No initData provided' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      return res.status(401).json({ error: 'No hash in initData' });
    }

    params.delete('hash');
    
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Telegram WebApp verification uses a binary HMAC digest as the second-step key.
    // Using the first digest as a hex string breaks verification for real initData payloads.
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const hashBuffer = Buffer.from(hash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
    if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      return res.status(401).json({ error: 'Invalid hash' });
    }

    const rawUser = params.get('user');
    if (!rawUser) {
      return res.status(401).json({ error: 'No user in initData' });
    }
    const userData = JSON.parse(rawUser);
    
    req.user = {
      tgId: userData.id.toString(),
      username: userData.username,
      firstName: userData.first_name,
      lastName: userData.last_name
    };

    next();
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice('Bearer '.length);
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const payload = jwt.verify(token, secret);

    const user = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(payload.tgId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      tgId: user.tg_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      ageVerified: user.age_verified,
      status: user.status,
    };

    if (!req.user.ageVerified) {
      return res.status(403).json({ error: 'Age verification required' });
    }

    next();
  } catch (err) {
    console.error('JWT auth error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAuthAllowUnverified = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice('Bearer '.length);
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const payload = jwt.verify(token, secret);

    const user = db.prepare('SELECT * FROM users WHERE tg_id = ?').get(payload.tgId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      tgId: user.tg_id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      ageVerified: user.age_verified,
      status: user.status,
    };

    next();
  } catch (err) {
    console.error('JWT auth error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
