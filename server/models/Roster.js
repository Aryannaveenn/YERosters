import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
}, { _id: true });

const rosterSchema = new mongoose.Schema({
  weekStarting: { type: Date, required: true, unique: true },
  shifts: [shiftSchema],
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  generatedBy: { type: String, enum: ['ai', 'manual'], default: 'manual' },
}, { timestamps: true });

export default mongoose.model('Roster', rosterSchema, 'RostersYE');
