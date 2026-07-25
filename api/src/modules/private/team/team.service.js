import { ScaffoldService } from '../../../shared/utils/moduleScaffold.js';
import teamRepository from './team.repository.js';
import playerRepository from '../player/player.repository.js';
import { uploadImage } from '../../../shared/utils/imagekit.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/index.js';

class TeamService extends ScaffoldService {
  constructor(repository = teamRepository, playerRepo = playerRepository) {
    super('team', repository);
    this.playerRepo = playerRepo;
  }

  getUserId(user) {
    return user?.id || user?._id || null;
  }

  getPlayerId(player) {
    return player?._id || player;
  }

  isPlayerInSquad(team, playerId) {
    return team.squadPlayers.some((player) => String(this.getPlayerId(player)) === String(playerId));
  }

  async createTeam(data, file, requester = null) {
    const payload = { ...data };

    if (file) {
      const logoUrl = await uploadImage(file.buffer, file.originalname, 'teams');
      if (logoUrl) payload.logo = logoUrl;
    }

    if (!payload.logo) {
      throw new BadRequestError('Team logo file or logo URL is required');
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
      status: query.status,
    };
  }

  async getAllTeams(query = {}) {
    return this.repository.findAll(this.getListFilters(query), this.getPagination(query));
  }

  async getTeamById(id) {
    const team = await this.repository.findById(id);
    if (!team) throw new NotFoundError('Team not found');
    return team;
  }

  async updateTeam(id, data, file, requester = null) {
    const payload = { ...data };

    if (file) {
      const logoUrl = await uploadImage(file.buffer, file.originalname, 'teams');
      if (logoUrl) payload.logo = logoUrl;
    }

    const userId = this.getUserId(requester);
    if (userId) {
      payload.updatedBy = userId;
    }

    const team = await this.repository.update(id, payload);
    if (!team) throw new NotFoundError('Team not found');
    return team;
  }

  async deleteTeam(id, requester = null) {
    const matchDependencies = await this.repository.countMatchDependencies(id);

    if (matchDependencies > 0) {
      throw new ConflictError('Team cannot be deleted while linked with matches or series');
    }

    const team = await this.repository.delete(id, this.getUserId(requester));
    if (!team) throw new NotFoundError('Team not found');
    return team;
  }

  async assignPlayer(teamId, playerId, requester = null) {
    const player = await this.playerRepo.findById(playerId);
    if (!player) throw new NotFoundError('Player not found');

    const existingTeam = await this.repository.findById(teamId);
    if (!existingTeam) throw new NotFoundError('Team not found');

    const assignedTeam = await this.repository.findTeamByPlayerId(playerId);
    if (assignedTeam && String(assignedTeam._id) !== String(teamId)) {
      throw new ConflictError(`Player is already assigned to ${assignedTeam.name} squad`);
    }

    if (!this.isPlayerInSquad(existingTeam, playerId) && existingTeam.squadPlayers.length >= 20) {
      throw new BadRequestError('Team squad cannot have more than 20 players');
    }

    const team = await this.repository.addPlayer(teamId, playerId, this.getUserId(requester));
    if (!team) throw new NotFoundError('Team not found');

    return this.updateTeamStatus(teamId, requester);
  }

  async removePlayer(teamId, playerId, requester = null) {
    const player = await this.playerRepo.findById(playerId);
    if (!player) throw new NotFoundError('Player not found');

    const existingTeam = await this.repository.findById(teamId);
    if (!existingTeam) throw new NotFoundError('Team not found');

    if (!this.isPlayerInSquad(existingTeam, playerId)) {
      throw new BadRequestError('Player is not assigned to this team squad');
    }

    const livePlayingXiDependencies = await this.repository.countLivePlayingXiDependencies(teamId, playerId);
    if (livePlayingXiDependencies > 0) {
      throw new ConflictError('Player cannot be removed while selected in a live match Playing XI');
    }

    const team = await this.repository.removePlayer(teamId, playerId, this.getUserId(requester));
    if (!team) throw new NotFoundError('Team not found');

    return this.updateTeamStatus(teamId, requester);
  }

  async updateTeamStatus(teamId, requester = null) {
    const team = await this.repository.findById(teamId);
    if (!team) throw new NotFoundError('Team not found');

    const status = team.squadPlayers.length >= 11 ? 'PUBLISHED' : 'DRAFT';
    return this.repository.update(teamId, {
      status,
      ...(this.getUserId(requester) ? { updatedBy: this.getUserId(requester) } : {}),
    });
  }

  async getTeamPlayers(teamId) {
    const team = await this.repository.findById(teamId);
    if (!team) throw new NotFoundError('Team not found');
    return team.squadPlayers;
  }
}

export { TeamService };
export default new TeamService();
