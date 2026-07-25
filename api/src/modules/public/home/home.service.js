import { MatchStatus } from '../../../shared/constants/matchStatus.js';
import Match from '../../private/match/match.model.js';
import Score from '../../private/score/score.model.js';

class HomePublicService {
  populateMatch(query) {
    return query
      .populate('series', 'name season matchType status')
      .populate('team1', 'name shortName logo primaryColor')
      .populate('team2', 'name shortName logo primaryColor')
      .populate('tossWinner', 'name shortName logo primaryColor')
      .populate('winner', 'name shortName logo primaryColor');
  }

  async attachLiveScores(matches = []) {
    const matchIds = matches.map((match) => match._id);
    const scores = await Score.find({ match: { $in: matchIds } })
      .populate('battingTeam', 'name shortName logo primaryColor')
      .sort({ innings: 1 });
    const scoreMap = new Map();

    scores.forEach((score) => {
      const matchId = String(score.match);
      const list = scoreMap.get(matchId) || [];
      list.push(score);
      scoreMap.set(matchId, list);
    });

    return matches.map((match) => {
      const data = match.toObject ? match.toObject() : match;
      const matchScores = scoreMap.get(String(match._id)) || [];
      return {
        ...data,
        scores: matchScores,
        liveScore: matchScores[matchScores.length - 1] || null,
      };
    });
  }

  async getHomeFeed() {
    const baseQuery = { isDeleted: false };
    const [liveMatches, upcomingMatches, recentMatches] = await Promise.all([
      this.populateMatch(
        Match.find({ ...baseQuery, status: { $in: [MatchStatus.LIVE, MatchStatus.INNINGS_BREAK] } })
          .sort({ scheduledAt: 1 })
          .limit(10)
      ),
      this.populateMatch(
        Match.find({ ...baseQuery, status: { $in: [MatchStatus.UPCOMING, MatchStatus.TOSS_COMPLETED, MatchStatus.PLAYING_XI_SELECTED] } })
          .sort({ scheduledAt: 1 })
          .limit(10)
      ),
      this.populateMatch(
        Match.find({ ...baseQuery, status: MatchStatus.COMPLETED })
          .sort({ updatedAt: -1 })
          .limit(10)
      ),
    ]);

    const [liveWithScores, upcomingWithScores, recentWithScores] = await Promise.all([
      this.attachLiveScores(liveMatches),
      this.attachLiveScores(upcomingMatches),
      this.attachLiveScores(recentMatches),
    ]);

    return {
      liveMatches: liveWithScores,
      upcomingMatches: upcomingWithScores,
      recentMatches: recentWithScores,
    };
  }
}

export { HomePublicService };
export default new HomePublicService();
