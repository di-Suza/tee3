import asyncHandler from '../../../shared/utils/asyncHandler.js';
import teamService from './team.service.js';

class TeamPublicController {
  constructor(service = teamService) {
    this.service = service;
    this.getAll = asyncHandler(this.getAll.bind(this));
    this.getById = asyncHandler(this.getById.bind(this));
  }

  async getAll(req, res) {
    const { teams, pagination } = await this.service.getTeams(req.validated);
    res.json({ success: true, data: teams, meta: pagination });
  }

  async getById(req, res) {
    const team = await this.service.getTeamById(req.validated.id);
    res.json({ success: true, data: team });
  }
}

export { TeamPublicController };
export default new TeamPublicController();
