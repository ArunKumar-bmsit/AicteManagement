const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workoutSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  certificate: {
    // Store the file directly in MongoDB with metadata
    data: {
      type: Buffer, // Binary data of the uploaded file
      required: true,
    },
    filename: {
      type: String, // Original file name
      required: true,
    },
    size: {
      type: Number, // File size in bytes
      required: true,
    },
    contentType: {
      type: String, // MIME type (e.g., 'application/pdf', 'image/png')
      required: true,
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Workout', workoutSchema);
