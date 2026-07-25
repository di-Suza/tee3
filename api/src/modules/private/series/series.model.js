import mongoose from 'mongoose';
import { MatchStatus } from '../../../shared/constants/matchStatus.js';

const SERIES_STATUSES = Object.freeze(['UPCOMING', 'LIVE', 'COMPLETED']);
const SERIES_FORMATS = Object.freeze(['A', 'B', 'C']);
const SERIES_GROUPS = Object.freeze(['A', 'B']);
const SERIES_MATCH_TYPES = Object.freeze(['T20', 'ODI', 'TEST']);
const TOSS_DECISIONS = Object.freeze(['BAT', 'BOWL']);

const seriesTeamSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    group: {
      type: String,
      enum: [...SERIES_GROUPS, null],
      default: null,
    },
  },
  { _id: false }
);

const seriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    season: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: SERIES_STATUSES,
      default: 'UPCOMING',
    },
    format: {
      type: String,
      enum: SERIES_FORMATS,
      required: true,
    },
    matchType: {
      type: String,
      enum: SERIES_MATCH_TYPES,
      required: true,
      default: 'T20',
    },
    numberOfMatches: {
      type: Number,
      required: true,
      min: 1,
    },
    teams: [seriesTeamSchema],
    isDeleted: {
      type: Boolean,
      default: false,
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

seriesSchema.index({ name: 1, season: 1 }, { unique: true });

const playingXiPlayerSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    isCaptain: {
      type: Boolean,
      default: false,
    },
    isWicketKeeper: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const seriesMatchSchema = new mongoose.Schema(
  {
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Series',
      required: true,
    },
    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      trim: true,
      default: '',
    },
    matchType: {
      type: String,
      enum: SERIES_MATCH_TYPES,
      required: true,
      default: 'T20',
    },
    status: {
      type: String,
      enum: Object.values(MatchStatus),
      default: MatchStatus.UPCOMING,
    },
    tossWinner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    tossDecision: {
      type: String,
      enum: [...TOSS_DECISIONS, null],
      default: null,
    },
    playingXI: {
      team1: {
        type: [playingXiPlayerSchema],
        default: undefined,
      },
      team2: {
        type: [playingXiPlayerSchema],
        default: undefined,
      },
      selectedAt: {
        type: Date,
      },
      selectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    result: {
      type: String,
      trim: true,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
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

seriesMatchSchema.index({ series: 1, scheduledAt: 1 });

const Series = mongoose.models.Series || mongoose.model('Series', seriesSchema);
const SeriesMatch = mongoose.models.SeriesMatch || mongoose.model('SeriesMatch', seriesMatchSchema, 'matches');

export {
  SERIES_FORMATS,
  SERIES_GROUPS,
  SERIES_MATCH_TYPES,
  SERIES_STATUSES,
  SeriesMatch,
  TOSS_DECISIONS,
};
export default Series;
