import { Router } from 'express';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('defaultSchool', 'name').sort('name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const user = await User.create({ name, email, password, role: role || 'employee', phone });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/default-school', authenticate, requireAdmin, async (req, res) => {
  try {
    const { defaultSchool } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { defaultSchool: defaultSchool || null },
      { new: true }
    ).select('-password').populate('defaultSchool', 'name');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
