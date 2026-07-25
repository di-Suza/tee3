import { NotFoundError } from '../../../shared/errors/index.js';
import playerRepository from '../../private/player/player.repository.js';
import PublicQueryHelper from '../shared/query.js';

class PlayerPublicService {
  constructor(repository = playerRepository) {
    this.repository = repository;
  }

  getPagination(query = {}) {
    return {
      page: query.page || 1,
      limit: query.limit || 20,
    };
  }

  getListFilters(query = {}) {
    return {
      search: query.search,
      role: query.role,
      country: query.country,
    };
  }

  serializePlayer(player) {
    const data = player?.toObject ? player.toObject() : player;

    return {
      _id: data._id,
      name: data.name,
      image: data.image,
      role: data.role,
      country: data.country,
      battingStyle: data.battingStyle,
      bowlingStyle: data.bowlingStyle,
    };
  }

  async getPlayers(query = {}) {
    const { players, pagination } = await this.repository.findAll(
      this.getListFilters(query),
      this.getPagination(query)
    );

    return {
      players: players.map((player) => this.serializePlayer(player)),
      pagination,
    };
  }

  async getPlayerById(id) {
    const safeId = PublicQueryHelper.ensureId(id, 'Player');
    const player = await this.repository.findById(safeId);

    if (!player) throw new NotFoundError('Player not found');

    return this.serializePlayer(player);
  }
}

export { PlayerPublicService };
export default new PlayerPublicService();
