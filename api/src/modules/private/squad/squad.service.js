import { ScaffoldService } from '../../../shared/utils/moduleScaffold.js';
import squadRepository from './squad.repository.js';
import teamService from '../team/team.service.js';

class SquadService extends ScaffoldService {
  constructor(repository = squadRepository, teamManager = teamService) {
    super('squad', repository);
    this.teamManager = teamManager;
  }

  getSquad(teamId) {
    return this.teamManager.getTeamPlayers(teamId);
  }

  addPlayer(teamId, playerId, requester = null) {
    return this.teamManager.assignPlayer(teamId, playerId, requester);
  }

  removePlayer(teamId, playerId, requester = null) {
    return this.teamManager.removePlayer(teamId, playerId, requester);
  }
}

export { SquadService };
export default new SquadService();
