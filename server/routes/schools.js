import { Router } from 'express';
import School from '../models/School.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const schools = await School.find().sort('name');
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, days } = req.body;
    const school = await School.create({ name, days: days || [] });
    res.status(201).json(school);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, days } = req.body;
    const school = await School.findByIdAndUpdate(req.params.id, { name, days }, { new: true });
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await School.findByIdAndDelete(req.params.id);
    res.json({ message: 'School deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
