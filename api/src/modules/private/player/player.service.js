import { ScaffoldService } from '../../../shared/utils/moduleScaffold.js';
import playerRepository from './player.repository.js';
import { uploadImage } from '../../../shared/utils/imagekit.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/index.js';

class PlayerService extends ScaffoldService {
  constructor(repository = playerRepository) {
    super('player', repository);
  }

  getUserId(user) {
    return user?.id || user?._id || null;
  }

  async createPlayer(data, file, requester = null) {
    const payload = { ...data };

    if (file) {
      const imageUrl = await uploadImage(file.buffer, file.originalname, 'players');
      if (imageUrl) payload.image = imageUrl;
    }

    const userId = this.getUserId(requester);
    if (userId) {
      payload.createdBy = userId;
      payload.updatedBy = userId;
    }

    return this.repository.create(payload);
  }

  getPagination(query = {}) {
    return {
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  getListFilters(query = {}) {
    return {
      search: query.search,
      role: query.role,
      country: query.country,
    };
  }

  async getAllPlayers(query = {}) {
    const filters = this.getListFilters(query);

    if (query.availableForTeam) {
      filters.excludeIds = await this.repository.findAssignedPlayerIds();
    }

    return this.repository.findAll(filters, this.getPagination(query));
  }

  async getPlayerById(id) {
    const player = await this.repository.findById(id);
    if (!player) throw new NotFoundError('Player not found');
    return player;
  }

  async updatePlayer(id, data, file, requester = null) {
    const payload = { ...data };

    if (file) {
      const imageUrl = await uploadImage(file.buffer, file.originalname, 'players');
      if (imageUrl) payload.image = imageUrl;
    }

    const userId = this.getUserId(requester);
    if (userId) {
      payload.updatedBy = userId;
    }

    const player = await this.repository.update(id, payload);
    if (!player) throw new NotFoundError('Player not found');
    return player;
  }

  async deletePlayer(id, requester = null) {
    const [squadDependencies, playingXiDependencies] = await Promise.all([
      this.repository.countSquadDependencies(id),
      this.repository.countPlayingXiDependencies(id),
    ]);

    if (squadDependencies > 0) {
      throw new ConflictError('Player cannot be deleted while assigned to a team squad');
    }

    if (playingXiDependencies > 0) {
      throw new ConflictError('Player cannot be deleted while selected in a Playing XI');
    }

    const player = await this.repository.delete(id, this.getUserId(requester));
    if (!player) throw new NotFoundError('Player not found');
    return player;
  }
}

export { PlayerService };
export default new PlayerService();
