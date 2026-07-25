import asyncHandler from '../../../shared/utils/asyncHandler.js';
import squadService from './squad.service.js';

class SquadController {
  constructor(service = squadService) {
    this.service = service;
    this.getSquad = asyncHandler(this.getSquad.bind(this));
    this.addPlayer = asyncHandler(this.addPlayer.bind(this));
    this.removePlayer = asyncHandler(this.removePlayer.bind(this));
  }

  async getSquad(req, res) {
    const data = await this.service.getSquad(req.validated.teamId);
    res.json({ success: true, data });
  }

  async addPlayer(req, res) {
    const data = await this.service.addPlayer(req.validated.teamId, req.validated.playerId, req.user);
    res.json({ success: true, data, message: 'Player added to squad successfully' });
  }

  async removePlayer(req, res) {
    const data = await this.service.removePlayer(req.validated.teamId, req.validated.playerId, req.user);
    res.json({ success: true, data, message: 'Player removed from squad successfully' });
  }
}

export { SquadController };
export default new SquadController();
