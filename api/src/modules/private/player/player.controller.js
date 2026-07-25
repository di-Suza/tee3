import { ScaffoldController } from '../../../shared/utils/moduleScaffold.js';
import playerService from './player.service.js';

class PlayerController extends ScaffoldController {
  constructor(service = playerService) {
    super(service);
  }

  getAll = async (req, res, next) => {
    try {
      const { players, pagination } = await this.service.getAllPlayers(req.validated);
      res.status(200).json({ success: true, data: players, meta: pagination });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getPlayerById(req.validated.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = await this.service.createPlayer(req.validated, req.file, req.user);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id, ...payload } = req.validated;
      const data = await this.service.updatePlayer(id, payload, req.file, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.service.deletePlayer(req.validated.id, req.user);
      res.status(200).json({ success: true, message: 'Player deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}

export { PlayerController };
export default new PlayerController();
