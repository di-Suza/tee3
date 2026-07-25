import { NotFoundError } from '../../../shared/errors/index.js';
import Commentary from '../../private/commentary/commentary.model.js';
import Match from '../../private/match/match.model.js';
import PublicQueryHelper from '../shared/query.js';

class CommentaryPublicService {
  populateCommentary(query) {
    return query
      .populate('scoreEvent', 'innings over ball runs extras totalRuns isWicket extraType')
      .populate('createdBy', 'name role');
  }

  async getCommentary(matchId, query = {}) {
    const safeMatchId = PublicQueryHelper.ensureId(matchId, 'Match');
    const match = await Match.findOne({ _id: safeMatchId, isDeleted: false }).select('_id');
    if (!match) throw new NotFoundError('Match not found');

    const { page, limit, skip } = PublicQueryHelper.pagination({ page: query.page, limit: query.limit || 50 });
    const listQuery = { match: safeMatchId, isDeleted: false };
    const [commentary, total] = await Promise.all([
      this.populateCommentary(Commentary.find(listQuery).sort({ createdAt: -1 }).skip(skip).limit(limit)),
      Commentary.countDocuments(listQuery),
    ]);

    return {
      commentary,
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
}

export { CommentaryPublicService };
export default new CommentaryPublicService();
