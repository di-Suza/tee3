import { MatchStatus } from '../../../shared/constants/matchStatus.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import Match from '../../private/match/match.model.js';
import Score from '../../private/score/score.model.js';
import scoreService from '../../private/score/score.service.js';
import PublicQueryHelper from '../shared/query.js';

const PUBLIC_STATUS_MAP = Object.freeze({
  live: [MatchStatus.LIVE, MatchStatus.INNINGS_BREAK],
  upcoming: [MatchStatus.UPCOMING, MatchStatus.TOSS_COMPLETED, MatchStatus.PLAYING_XI_SELECTED],
  completed: [MatchStatus.COMPLETED],
});

class MatchPublicService {
  populateMatch(query) {
    return query
      .populate('series', 'name season matchType status')
      .populate({ path: 'team1', select: 'name shortName logo primaryColor squadPlayers', populate: { path: 'squadPlayers', select: 'name role country image' } })
      .populate({ path: 'team2', select: 'name shortName logo primaryColor squadPlayers', populate: { path: 'squadPlayers', select: 'name role country image' } })
      .populate('tossWinner', 'name shortName logo primaryColor')
      .populate('winner', 'name shortName logo primaryColor')
      .populate('playingXI.team1.player', 'name role country image')
      .populate('playingXI.team2.player', 'name role country image');
  }

  populateScore(query) {
    return query
      .populate('battingTeam', 'name shortName logo primaryColor')
      .populate('bowlingTeam', 'name shortName logo primaryColor')
      .populate('currentStriker', 'name role country image')
      .populate('currentNonStriker', 'name role country image')
      .populate('currentBowler', 'name role country image');
  }

  buildMatchQuery(query = {}) {
    const matchQuery = { isDeleted: false };

    if (query.status && PUBLIC_STATUS_MAP[query.status]) {
      matchQuery.status = { $in: PUBLIC_STATUS_MAP[query.status] };
    }

    if (query.seriesId) {
      matchQuery.series = PublicQueryHelper.ensureId(query.seriesId, 'Series');
    }

    return matchQuery;
  }

  async getMatches(query = {}) {
    const { page, limit, skip } = PublicQueryHelper.pagination(query);
    const matchQuery = this.buildMatchQuery(query);
    const [matches, total] = await Promise.all([
      this.populateMatch(Match.find(matchQuery).sort({ scheduledAt: 1 }).skip(skip).limit(limit)),
      Match.countDocuments(matchQuery),
    ]);

    return {
      matches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getMatch(matchId) {
    const safeId = PublicQueryHelper.ensureId(matchId, 'Match');
    const match = await this.populateMatch(Match.findOne({ _id: safeId, isDeleted: false }));
    if (!match) throw new NotFoundError('Match not found');

    const scores = await this.populateScore(Score.find({ match: safeId }).sort({ innings: 1 }));
    return { match, scores };
  }

  async getMatchCenter(matchId) {
    const scoreboard = await scoreService.getScoreboard(matchId);
    const { match, scores, recentEvents, stats, inningsPlayerMeta, fallOfWickets } = scoreboard;
    const liveScore = scores[scores.length - 1] || null;

    return {
      matchInfo: match,
      liveScore,
      scores,
      recentEvents,
      stats,
      inningsPlayerMeta,
      fallOfWickets,
      playingXI: match.playingXI,
      result: match.status === MatchStatus.COMPLETED ? { winner: match.winner, result: match.result } : null,
    };
  }

  async getScorecard(matchId) {
    const { match, scores } = await this.getMatch(matchId);
    return {
      match,
      innings: scores.map((score) => ({
        innings: score.innings,
        score,
      })),
    };
  }
}

export { MatchPublicService };
export default new MatchPublicService();
