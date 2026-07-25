import { ScaffoldRepository } from '../../../shared/utils/moduleScaffold.js';
import Series from '../series/series.model.js';
import Team from '../team/team.model.js';
import Match from './match.model.js';

class MatchRepository extends ScaffoldRepository {
  constructor(model = Match, seriesModel = Series, teamModel = Team) {
    super('match');
    this.model = model;
    this.seriesModel = seriesModel;
    this.teamModel = teamModel;
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  buildPagination(pagination = {}) {
    const page = Number(pagination.page || 1);
    const limit = Number(pagination.limit || 10);

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

  buildListQuery(filters = {}) {
    const query = { isDeleted: false };

    if (filters.seriesId) query.series = filters.seriesId;
    if (filters.status) query.status = filters.status;
    if (filters.matchType) query.matchType = filters.matchType;
    if (filters.search) {
      query.venue = { $regex: this.escapeRegex(filters.search), $options: 'i' };
    }

    return query;
  }

  populateQuery(query) {
    return query
      .populate('series', 'name season status format matchType numberOfMatches startDate endDate teams')
      .populate('team1', 'name shortName logo primaryColor squadPlayers')
      .populate('team2', 'name shortName logo primaryColor squadPlayers')
      .populate('tossWinner', 'name shortName logo primaryColor')
      .populate('winner', 'name shortName logo primaryColor')
      .populate('playingXI.team1.player', 'name role country image')
      .populate('playingXI.team2.player', 'name role country image');
  }

  async findAll(filters = {}, pagination = {}) {
    const { page, limit, skip } = this.buildPagination(pagination);
    const query = this.buildListQuery(filters);
    const [matches, total] = await Promise.all([
      this.populateQuery(this.model.find(query)).sort({ scheduledAt: 1, createdAt: 1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      matches,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  findById(id) {
    return this.populateQuery(this.model.findOne({ _id: id, isDeleted: false }));
  }

  findSeriesById(id) {
    return this.seriesModel
      .findOne({ _id: id, isDeleted: false })
      .populate({
        path: 'teams.team',
        match: { isDeleted: false },
        select: 'name shortName logo primaryColor squadPlayers status',
      });
  }

  countSeriesMatches(seriesId) {
    return this.model.countDocuments({
      series: seriesId,
      isDeleted: false,
    });
  }

  findTeamsByIds(teamIds = []) {
    return this.teamModel
      .find({
        _id: { $in: teamIds },
        isDeleted: false,
      })
      .select('name shortName logo primaryColor squadPlayers status');
  }

  async create(data) {
    const match = await this.model.create(data);
    return this.findById(match._id);
  }

  update(id, data) {
    return this.populateQuery(
      this.model.findOneAndUpdate(
        { _id: id, isDeleted: false },
        data,
        { new: true, runValidators: true }
      )
    );
  }

  delete(id, deletedBy = null) {
    return this.populateQuery(
      this.model.findOneAndUpdate(
        { _id: id, isDeleted: false },
        {
          isDeleted: true,
          ...(deletedBy ? { updatedBy: deletedBy } : {}),
        },
        { new: true }
      )
    );
  }
}

export { MatchRepository };
export default new MatchRepository();
