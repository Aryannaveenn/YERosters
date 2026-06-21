import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStarting: { type: Date, required: true },
  days: {
    monday:    { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
    tuesday:   { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
    wednesday: { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
    thursday:  { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
    friday:    { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
  },
}, { timestamps: true });

availabilitySchema.index({ user: 1, weekStarting: 1 }, { unique: true });

export default mongoose.model('Availability', availabilitySchema, 'AvailabilitiesYE');
