import mongoose from 'mongoose';

const COMMENTARY_TYPES = Object.freeze(['NORMAL', 'FOUR', 'SIX', 'WICKET', 'MILESTONE']);

const commentarySchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeriesMatch',
      required: true,
    },
    scoreEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScoreEvent',
      default: null,
    },
    innings: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    over: {
      type: Number,
      required: true,
      min: 0,
    },
    ball: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: COMMENTARY_TYPES,
      default: 'NORMAL',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

commentarySchema.index({ match: 1, createdAt: -1 });
commentarySchema.index({ match: 1, innings: 1, over: 1, ball: 1 });

const Commentary = mongoose.models.Commentary || mongoose.model('Commentary', commentarySchema);

export {
  COMMENTARY_TYPES,
};
export default Commentary;
