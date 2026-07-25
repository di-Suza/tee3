import { ScaffoldRepository } from '../../../shared/utils/moduleScaffold.js';
import Match from '../match/match.model.js';
import { ScoreEvent } from '../score/score.model.js';
import Commentary from './commentary.model.js';

class CommentaryRepository extends ScaffoldRepository {
  constructor(model = Commentary, scoreEventModel = ScoreEvent, matchModel = Match) {
    super('commentary');
    this.model = model;
    this.scoreEventModel = scoreEventModel;
    this.matchModel = matchModel;
  }

  buildPagination(query = {}) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  buildPaginationMeta(total, page, limit) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  populateMatch(query) {
    return query
      .populate('series', 'name season matchType status')
      .populate('team1', 'name shortName logo primaryColor')
      .populate('team2', 'name shortName logo primaryColor');
  }

  populateCommentary(query) {
    return query
      .populate('scoreEvent', 'innings over ball runs extras totalRuns isWicket extraType')
      .populate('createdBy', 'name role');
  }

  findMatch(matchId) {
    return this.populateMatch(this.matchModel.findOne({ _id: matchId, isDeleted: false }));
  }

  findScoreEvent(matchId, scoreEventId) {
    return this.scoreEventModel.findOne({ _id: scoreEventId, match: matchId });
  }

  findLatestScoreEvent(matchId) {
    return this.scoreEventModel.findOne({ match: matchId }).sort({ createdAt: -1 });
  }

  async create(data) {
    const commentary = await this.model.create(data);
    return this.populateCommentary(this.model.findById(commentary._id));
  }

  delete(id, deletedBy = null) {
    return this.model.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        isDeleted: true,
        ...(deletedBy ? { updatedBy: deletedBy } : {}),
      },
      { new: true }
    );
  }

  async findAll(matchId, query = {}) {
    const { page, limit, skip } = this.buildPagination(query);
    const listQuery = { match: matchId, isDeleted: false };

    if (query.innings) listQuery.innings = Number(query.innings);

    const [commentary, total] = await Promise.all([
      this.populateCommentary(
        this.model.find(listQuery).sort({ createdAt: -1 }).skip(skip).limit(limit)
      ),
      this.model.countDocuments(listQuery),
    ]);

    return {
      commentary,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }
}

export { CommentaryRepository };
export default new CommentaryRepository();
