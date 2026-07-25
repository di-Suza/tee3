import { ScaffoldRepository } from '../../../shared/utils/moduleScaffold.js';
import Team from './team.model.js';
import mongoose from 'mongoose';

class TeamRepository extends ScaffoldRepository {
  constructor() {
    super('team');
    this.model = Team;
  }

  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getIdValues(id) {
    const values = [String(id)];

    if (mongoose.Types.ObjectId.isValid(id)) {
      values.push(new mongoose.Types.ObjectId(id));
    }

    return values;
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
      query.$or = [{ name: search }, { shortName: search }];
    }

    if (filters.status) {
      query.status = filters.status;
    }

    return query;
  }

  create(data) {
    return this.model.create(data);
  }

  async findAll(filters = {}, pagination = {}) {
    const { page, limit, skip } = this.buildPagination(pagination);
    const query = this.buildListQuery(filters);
    const [teams, total] = await Promise.all([
      this.model
        .find(query)
        .populate({
          path: 'squadPlayers',
          match: { isDeleted: false },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      teams,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  findById(id) {
    return this.model.findOne({ _id: id, isDeleted: false }).populate({
      path: 'squadPlayers',
      match: { isDeleted: false },
    });
  }

  update(id, data) {
    return this.model.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
      new: true,
      runValidators: true,
    });
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

  addPlayer(teamId, playerId, updatedBy = null) {
    return this.model.findOneAndUpdate(
      { _id: teamId, isDeleted: false },
      {
        $addToSet: { squadPlayers: playerId },
        ...(updatedBy ? { $set: { updatedBy } } : {}),
      },
      { new: true }
    );
  }

  removePlayer(teamId, playerId, updatedBy = null) {
    return this.model.findOneAndUpdate(
      { _id: teamId, isDeleted: false },
      {
        $pull: { squadPlayers: playerId },
        ...(updatedBy ? { $set: { updatedBy } } : {}),
      },
      { new: true }
    );
  }

  findTeamByPlayerId(playerId) {
    return this.model
      .findOne({
        isDeleted: false,
        squadPlayers: { $in: this.getIdValues(playerId) },
      })
      .select('_id name shortName');
  }

  countMatchDependencies(teamId) {
    const values = this.getIdValues(teamId);

    return mongoose.connection.collection('matches').countDocuments({
      isDeleted: { $ne: true },
      $or: [
        { team1: { $in: values } },
        { team2: { $in: values } },
        { teamA: { $in: values } },
        { teamB: { $in: values } },
        { homeTeam: { $in: values } },
        { awayTeam: { $in: values } },
        { teams: { $in: values } },
        { 'team1.team': { $in: values } },
        { 'team2.team': { $in: values } },
        { 'team1.teamId': { $in: values } },
        { 'team2.teamId': { $in: values } },
        { 'teamA.team': { $in: values } },
        { 'teamB.team': { $in: values } },
        { 'homeTeam.team': { $in: values } },
        { 'awayTeam.team': { $in: values } },
      ],
    });
  }

  countLivePlayingXiDependencies(teamId, playerId) {
    const teamValues = this.getIdValues(teamId);
    const playerValues = this.getIdValues(playerId);

    return mongoose.connection.collection('matches').countDocuments({
      isDeleted: { $ne: true },
      status: 'LIVE',
      $and: [
        {
          $or: [
            { team1: { $in: teamValues } },
            { team2: { $in: teamValues } },
            { teamA: { $in: teamValues } },
            { teamB: { $in: teamValues } },
            { homeTeam: { $in: teamValues } },
            { awayTeam: { $in: teamValues } },
            { teams: { $in: teamValues } },
            { 'team1.team': { $in: teamValues } },
            { 'team2.team': { $in: teamValues } },
            { 'team1.teamId': { $in: teamValues } },
            { 'team2.teamId': { $in: teamValues } },
          ],
        },
        {
          $or: [
            { playingXI: { $in: playerValues } },
            { 'playingXI.players': { $in: playerValues } },
            { 'playingXI.player': { $in: playerValues } },
            { 'playingXI.team1': { $in: playerValues } },
            { 'playingXI.team2': { $in: playerValues } },
            { 'playingXI.team1.players': { $in: playerValues } },
            { 'playingXI.team2.players': { $in: playerValues } },
            { 'playingXI.team1.player': { $in: playerValues } },
            { 'playingXI.team2.player': { $in: playerValues } },
            { 'team1.playingXI': { $in: playerValues } },
            { 'team2.playingXI': { $in: playerValues } },
            { team1PlayingXI: { $in: playerValues } },
            { team2PlayingXI: { $in: playerValues } },
          ],
        },
      ],
    });
  }
}

export { TeamRepository };
export default new TeamRepository();
