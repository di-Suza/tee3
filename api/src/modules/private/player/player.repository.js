import { ScaffoldRepository } from '../../../shared/utils/moduleScaffold.js';
import Player from './player.model.js';
import Team from '../team/team.model.js';
import mongoose from 'mongoose';

class PlayerRepository extends ScaffoldRepository {
  constructor() {
    super('player');
    this.model = Player;
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

    if (filters.excludeIds?.length) {
      query._id = { $nin: filters.excludeIds };
    }

    if (filters.search) {
      query.name = { $regex: this.escapeRegex(filters.search), $options: 'i' };
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.country) {
      query.country = { $regex: this.escapeRegex(filters.country), $options: 'i' };
    }

    return query;
  }

  create(data) {
    return this.model.create(data);
  }

  async findAll(filters = {}, pagination = {}) {
    const { page, limit, skip } = this.buildPagination(pagination);
    const query = this.buildListQuery(filters);
    const [players, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      players,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  findById(id) {
    return this.model.findOne({ _id: id, isDeleted: false });
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

  countSquadDependencies(playerId) {
    return Team.countDocuments({
      isDeleted: false,
      squadPlayers: { $in: this.getIdValues(playerId) },
    });
  }

  async findAssignedPlayerIds() {
    const teams = await Team.find({ isDeleted: false }).select('squadPlayers');

    return teams.flatMap((team) => team.squadPlayers || []);
  }

  countPlayingXiDependencies(playerId, options = {}) {
    const values = this.getIdValues(playerId);
    const playerClauses = [
      { playingXI: { $in: values } },
      { 'playingXI.players': { $in: values } },
      { 'playingXI.player': { $in: values } },
      { 'playingXI.team1': { $in: values } },
      { 'playingXI.team2': { $in: values } },
      { 'playingXI.team1.players': { $in: values } },
      { 'playingXI.team2.players': { $in: values } },
      { 'playingXI.team1.player': { $in: values } },
      { 'playingXI.team2.player': { $in: values } },
      { 'team1.playingXI': { $in: values } },
      { 'team2.playingXI': { $in: values } },
      { team1PlayingXI: { $in: values } },
      { team2PlayingXI: { $in: values } },
    ];
    const query = {
      isDeleted: { $ne: true },
      $or: playerClauses,
    };

    if (options.liveOnly) {
      query.status = 'LIVE';
    }

    return mongoose.connection.collection('matches').countDocuments(query);
  }
}

export { PlayerRepository };
export default new PlayerRepository();
