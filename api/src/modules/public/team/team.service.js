import { NotFoundError } from '../../../shared/errors/index.js';
import teamRepository from '../../private/team/team.repository.js';
import PublicQueryHelper from '../shared/query.js';

class TeamPublicService {
  constructor(repository = teamRepository) {
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
      status: query.status,
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
    };
  }

  serializeTeam(team) {
    const data = team?.toObject ? team.toObject() : team;

    return {
      _id: data._id,
      name: data.name,
      shortName: data.shortName,
      logo: data.logo,
      primaryColor: data.primaryColor,
      status: data.status,
      squadPlayers: Array.isArray(data.squadPlayers)
        ? data.squadPlayers.filter(Boolean).map((player) => this.serializePlayer(player))
        : [],
    };
  }

  async getTeams(query = {}) {
    const { teams, pagination } = await this.repository.findAll(
      this.getListFilters(query),
      this.getPagination(query)
    );

    return {
      teams: teams.map((team) => this.serializeTeam(team)),
      pagination,
    };
  }

  async getTeamById(id) {
    const safeId = PublicQueryHelper.ensureId(id, 'Team');
    const team = await this.repository.findById(safeId);

    if (!team) throw new NotFoundError('Team not found');

    return this.serializeTeam(team);
  }
}

export { TeamPublicService };
export default new TeamPublicService();
