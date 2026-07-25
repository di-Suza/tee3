import { MatchStatus } from '../../../shared/constants/matchStatus.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import Match from '../../private/match/match.model.js';
import Series from '../../private/series/series.model.js';
import PublicQueryHelper from '../shared/query.js';

class PointsTablePublicService {
  getTeamData(entry) {
    const team = entry.team?.toObject ? entry.team.toObject() : entry.team;
    return {
      _id: team?._id,
      name: team?.name,
      shortName: team?.shortName,
      logo: team?.logo,
      primaryColor: team?.primaryColor,
    };
  }

  async getPointsTable(seriesId) {
    const safeSeriesId = PublicQueryHelper.ensureId(seriesId, 'Series');
    const series = await Series.findOne({ _id: safeSeriesId, isDeleted: false }).populate({
      path: 'teams.team',
      match: { isDeleted: false },
      select: 'name shortName logo primaryColor',
    });

    if (!series) throw new NotFoundError('Series not found');

    const tableMap = new Map();
    (series.teams || []).forEach((entry) => {
      if (!entry.team) return;
      const teamId = String(entry.team._id);
      tableMap.set(teamId, {
        team: this.getTeamData(entry),
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
      });
    });

    const matches = await Match.find({
      series: safeSeriesId,
      status: MatchStatus.COMPLETED,
      isDeleted: false,
    }).populate('team1 team2 winner', 'name shortName logo primaryColor');

    matches.forEach((match) => {
      const teamIds = [String(match.team1?._id || match.team1), String(match.team2?._id || match.team2)];
      const winnerId = match.winner ? String(match.winner?._id || match.winner) : null;

      teamIds.forEach((teamId) => {
        if (!tableMap.has(teamId)) return;
        tableMap.get(teamId).played += 1;
        if (winnerId && winnerId === teamId) {
          tableMap.get(teamId).won += 1;
          tableMap.get(teamId).points += 2;
        } else if (winnerId) {
          tableMap.get(teamId).lost += 1;
        }
      });
    });

    return Array.from(tableMap.values()).sort((a, b) => b.points - a.points || b.won - a.won || a.team.name.localeCompare(b.team.name));
  }
}

export { PointsTablePublicService };
export default new PointsTablePublicService();
