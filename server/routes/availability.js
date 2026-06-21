import { Router } from 'express';
import Availability from '../models/Availability.js';
import AvailabilityRequest from '../models/AvailabilityRequest.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { notifyAdmin } from '../services/twilio.js';

const router = Router();

router.get('/me', authenticate, async (req, res) => {
  try {
    const { weekStarting } = req.query;
    const query = { user: req.user._id };
    if (weekStarting) query.weekStarting = new Date(weekStarting);
    const availability = await Availability.find(query).sort('-weekStarting');
    res.json(availability);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/week/:weekStarting', authenticate, async (req, res) => {
  try {
    const availabilities = await Availability.find({
      weekStarting: new Date(req.params.weekStarting),
    }).populate('user', 'name email');
    res.json(availabilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const availabilities = await Availability.find({ user: req.params.userId }).sort('-weekStarting');
    res.json(availabilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await Availability.findByIdAndDelete(req.params.id);
    res.json({ message: 'Availability deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Employee submits a request instead of saving directly
router.put('/', authenticate, async (req, res) => {
  try {
    const { weekStarting, days } = req.body;
    const request = await AvailabilityRequest.create({
      user: req.user._id,
      weekStarting: new Date(weekStarting),
      days,
    });

    notifyAdmin(`${req.user.name} requested availability change for week of ${new Date(weekStarting).toLocaleDateString()}`);

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Employee can see their pending requests
router.get('/requests/me', authenticate, async (req, res) => {
  try {
    const requests = await AvailabilityRequest.find({ user: req.user._id }).sort('-createdAt');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list all pending requests
router.get('/requests', authenticate, requireAdmin, async (req, res) => {
  try {
    const requests = await AvailabilityRequest.find({ status: 'pending' })
      .populate('user', 'name email')
      .sort('-createdAt');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list requests for a specific user
router.get('/requests/user/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const requests = await AvailabilityRequest.find({ user: req.params.userId })
      .sort('-createdAt');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: approve request
router.post('/requests/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const request = await AvailabilityRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    await Availability.findOneAndUpdate(
      { user: request.user, weekStarting: request.weekStarting },
      { days: request.days },
      { upsert: true, new: true, runValidators: true }
    );

    request.status = 'approved';
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: deny request
router.post('/requests/:id/deny', authenticate, requireAdmin, async (req, res) => {
  try {
    const request = await AvailabilityRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

    request.status = 'denied';
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
