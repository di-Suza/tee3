import mongoose from 'mongoose';

const EXTRA_TYPES = Object.freeze(['NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE']);
const WICKET_TYPES = Object.freeze(['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_HURT', 'OTHER']);

const scoreSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeriesMatch',
      required: true,
    },
    innings: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    battingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    bowlingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    runs: {
      type: Number,
      default: 0,
      min: 0,
    },
    wickets: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    balls: {
      type: Number,
      default: 0,
      min: 0,
    },
    overs: {
      type: String,
      default: '0.0',
    },
    runRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    target: {
      type: Number,
      default: null,
      min: 1,
    },
    currentStriker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    currentNonStriker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    currentBowler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

const scoreEventSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SeriesMatch',
      required: true,
    },
    score: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Score',
      required: true,
    },
    innings: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    battingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    bowlingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    striker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    nonStriker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    bowler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    dismissedPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    newBatter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
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
    runs: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    batterRuns: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    extras: {
      type: Number,
      default: 0,
      min: 0,
    },
    extraType: {
      type: String,
      enum: EXTRA_TYPES,
      default: 'NONE',
    },
    totalRuns: {
      type: Number,
      required: true,
      min: 0,
    },
    isLegalBall: {
      type: Boolean,
      default: true,
    },
    isWicket: {
      type: Boolean,
      default: false,
    },
    wicketType: {
      type: String,
      enum: [...WICKET_TYPES, null],
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

scoreSchema.index({ match: 1, innings: 1 }, { unique: true });
scoreEventSchema.index({ match: 1, createdAt: -1 });
scoreEventSchema.index({ match: 1, innings: 1, over: 1, ball: 1 });

const Score = mongoose.models.Score || mongoose.model('Score', scoreSchema);
const ScoreEvent = mongoose.models.ScoreEvent || mongoose.model('ScoreEvent', scoreEventSchema, 'score_events');

export {
  EXTRA_TYPES,
  ScoreEvent,
  WICKET_TYPES,
};
export default Score;
