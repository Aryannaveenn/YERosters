import mongoose from 'mongoose';

const availabilityRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStarting: { type: Date, required: true },
  days: {
    monday:    { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
    tuesday:   { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
    wednesday: { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
    thursday:  { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
    friday:    { available: { type: Boolean, default: true }, startTime: { type: String, default: '09:00' }, endTime: { type: String, default: '17:00' } },
  },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model('AvailabilityRequest', availabilityRequestSchema, 'AvailabilityRequestsYE');
