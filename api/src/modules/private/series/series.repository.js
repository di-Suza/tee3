import mongoose from 'mongoose';
import { ScaffoldRepository } from '../../../shared/utils/moduleScaffold.js';
import Team from '../team/team.model.js';
import Series, { SeriesMatch } from './series.model.js';

class SeriesRepository extends ScaffoldRepository {
  constructor() {
    super('series');
    this.model = Series;
    this.matchModel = SeriesMatch;
    this.teamModel = Team;
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

    if (filters.search) {
      const search = { $regex: this.escapeRegex(filters.search), $options: 'i' };
      query.$or = [{ name: search }, { season: search }];
    }

    if (filters.status) query.status = filters.status;
    if (filters.format) query.format = filters.format;
    if (filters.matchType) query.matchType = filters.matchType;

    return query;
  }

  populateQuery(query) {
    return query.populate({
      path: 'teams.team',
      match: { isDeleted: false },
      select: 'name shortName logo primaryColor status squadPlayers',
    });
  }

  create(data) {
    return this.model.create(data);
  }

  async findAll(filters = {}, pagination = {}) {
    const { page, limit, skip } = this.buildPagination(pagination);
    const query = this.buildListQuery(filters);
    const [series, total] = await Promise.all([
      this.populateQuery(this.model.find(query))
        .sort({ startDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      series,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  findById(id) {
    return this.populateQuery(this.model.findOne({ _id: id, isDeleted: false }));
  }

  findByNameAndSeason(name, season, excludedId = null) {
    const query = {
      name,
      season,
      isDeleted: false,
    };

    if (excludedId) {
      query._id = { $ne: excludedId };
    }

    return this.model.findOne(query);
  }

  update(id, data) {
    return this.populateQuery(
      this.model.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
        new: true,
        runValidators: true,
      })
    );
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

  countSeriesMatches(seriesId) {
    return this.matchModel.countDocuments({
      series: seriesId,
      isDeleted: false,
    });
  }

  getEligibleTeams() {
    return this.teamModel
      .find({
        isDeleted: false,
        squadPlayers: { $exists: true },
        $expr: { $gte: [{ $size: '$squadPlayers' }, 11] },
      })
      .select('name shortName logo primaryColor status squadPlayers')
      .sort({ name: 1 });
  }

  findTeamsByIds(teamIds = []) {
    return this.teamModel
      .find({
        _id: { $in: teamIds },
        isDeleted: false,
      })
      .select('name shortName logo primaryColor status squadPlayers');
  }

  createMatch(data) {
    return this.matchModel.create(data);
  }

  findSeriesMatches(seriesId) {
    return this.matchModel
      .find({ series: seriesId, isDeleted: false })
      .populate('team1', 'name shortName logo primaryColor')
      .populate('team2', 'name shortName logo primaryColor')
      .sort({ scheduledAt: 1, createdAt: 1 });
  }

  findSeriesMatch(seriesId, matchId) {
    return this.matchModel
      .findOne({ _id: matchId, series: seriesId, isDeleted: false })
      .populate('team1', 'name shortName logo primaryColor')
      .populate('team2', 'name shortName logo primaryColor');
  }

  updateSeriesMatch(seriesId, matchId, data) {
    return this.matchModel
      .findOneAndUpdate(
        { _id: matchId, series: seriesId, isDeleted: false },
        data,
        { new: true, runValidators: true }
      )
      .populate('team1', 'name shortName logo primaryColor')
      .populate('team2', 'name shortName logo primaryColor');
  }

  isObjectId(value) {
    return mongoose.Types.ObjectId.isValid(value);
  }
}

export { SeriesRepository };
export default new SeriesRepository();
