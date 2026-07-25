import { BadRequestError } from '../../../shared/errors/index.js';
import Player from '../../private/player/player.model.js';
import Series from '../../private/series/series.model.js';
import Team from '../../private/team/team.model.js';
import PublicQueryHelper from '../shared/query.js';

class SearchPublicService {
  async search(query = {}) {
    const term = String(query.q || query.search || '').trim();
    if (term.length < 2) {
      throw new BadRequestError('Search query must be at least 2 characters');
    }

    const regex = { $regex: PublicQueryHelper.escapeRegex(term), $options: 'i' };
    const [players, teams, series] = await Promise.all([
      Player.find({ isDeleted: false, name: regex })
        .select('name image role country battingStyle bowlingStyle')
        .limit(10),
      Team.find({ isDeleted: false, $or: [{ name: regex }, { shortName: regex }] })
        .select('name shortName logo primaryColor')
        .limit(10),
      Series.find({ isDeleted: false, $or: [{ name: regex }, { season: regex }] })
        .select('name season status format matchType startDate endDate')
        .limit(10),
    ]);

    return {
      query: term,
      players,
      teams,
      series,
    };
  }
}

export { SearchPublicService };
export default new SearchPublicService();
