import { Router } from 'express';
import Settings from '../models/Settings.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

const DEFAULT_OPERATING_HOURS = { startTime: '09:00', endTime: '17:00' };

router.get('/operating-hours', authenticate, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'operatingHours' });
    res.json(setting?.value || DEFAULT_OPERATING_HOURS);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/operating-hours', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    const setting = await Settings.findOneAndUpdate(
      { key: 'operatingHours' },
      { value: { startTime, endTime } },
      { upsert: true, new: true }
    );
    res.json(setting.value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
