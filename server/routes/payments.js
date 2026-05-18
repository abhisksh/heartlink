const router = require('express').Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const jwtAuth = require('../middleware/jwtAuth');
const db = require('../db/database');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post('/create-order', jwtAuth, async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: 900,
      currency: 'INR',
      receipt: `hl_${req.userId}_${Date.now()}`,
      notes: { userId: String(req.userId), plan: 'weekly_premium' },
    });
    await db.aRun(
      'INSERT INTO payments (user_id, razorpay_order_id, amount, status) VALUES (?, ?, 900, ?)',
      [req.userId, order.id, 'pending']
    );
    res.json({ orderId: order.id, amount: 900, currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('Razorpay error:', err);
    res.status(500).json({ error: 'Payment order creation failed' });
  }
});

router.post('/verify', jwtAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  if (expected !== razorpay_signature) return res.status(400).json({ error: 'Verification failed' });

  const premiumUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.aRun('UPDATE users SET is_premium = 1, premium_until = ? WHERE id = ?', [premiumUntil, req.userId]);
  await db.aRun(
    "UPDATE payments SET razorpay_payment_id = ?, status = 'captured' WHERE razorpay_order_id = ?",
    [razorpay_payment_id, razorpay_order_id]
  );
  res.json({ success: true, premium_until: premiumUntil });
});

module.exports = router;
