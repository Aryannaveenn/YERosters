import { Router } from 'express';
import Roster from '../models/Roster.js';
import Availability from '../models/Availability.js';
import User from '../models/User.js';
import School from '../models/School.js';
import Settings from '../models/Settings.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { generateRosterWithAI } from '../services/ai.js';

const router = Router();

const populateShifts = (query) => query.populate('shifts.user', 'name email').populate('shifts.school', 'name days');

router.get('/:weekStarting', authenticate, async (req, res) => {
  try {
    const roster = await populateShifts(
      Roster.findOne({ weekStarting: new Date(req.params.weekStarting) })
    );
    if (!roster) return res.status(404).json({ error: 'Roster not found' });
    res.json(roster);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { weekStarting, customPrompt } = req.body;
    const week = new Date(weekStarting);

    const availabilities = await Availability.find({ weekStarting: week }).populate('user', 'name email');
    const employees = await User.find({ role: 'employee' }).select('name email defaultSchool').populate('defaultSchool', 'name');
    const schools = await School.find();
    const opHoursSetting = await Settings.findOne({ key: 'operatingHours' });
    const operatingHours = opHoursSetting?.value || { startTime: '09:00', endTime: '17:00' };

    const shifts = await generateRosterWithAI(availabilities, employees, schools, week, customPrompt, operatingHours);

    const roster = await Roster.findOneAndUpdate(
      { weekStarting: week },
      { shifts, generatedBy: 'ai', status: 'draft' },
      { upsert: true, new: true, runValidators: true }
    );
    const populated = await populateShifts(Roster.findById(roster._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:weekStarting', authenticate, requireAdmin, async (req, res) => {
  try {
    const { shifts, status } = req.body;
    const roster = await Roster.findOneAndUpdate(
      { weekStarting: new Date(req.params.weekStarting) },
      { shifts, status, generatedBy: 'manual' },
      { upsert: true, new: true, runValidators: true }
    );
    const populated = await populateShifts(Roster.findById(roster._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
