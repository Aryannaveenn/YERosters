import mongoose from 'mongoose';

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] }],
}, { timestamps: true });

export default mongoose.model('School', schoolSchema, 'SchoolsYE');
