import asyncHandler from '../../../shared/utils/asyncHandler.js';
import playerService from './player.service.js';

class PlayerPublicController {
  constructor(service = playerService) {
    this.service = service;
    this.getAll = asyncHandler(this.getAll.bind(this));
    this.getById = asyncHandler(this.getById.bind(this));
  }

  async getAll(req, res) {
    const { players, pagination } = await this.service.getPlayers(req.validated);
    res.json({ success: true, data: players, meta: pagination });
  }

  async getById(req, res) {
    const player = await this.service.getPlayerById(req.validated.id);
    res.json({ success: true, data: player });
  }
}

export { PlayerPublicController };
export default new PlayerPublicController();
