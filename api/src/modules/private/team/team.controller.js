import { ScaffoldController } from '../../../shared/utils/moduleScaffold.js';
import teamService from './team.service.js';

class TeamController extends ScaffoldController {
  constructor(service = teamService) {
    super(service);
  }

  getAll = async (req, res, next) => {
    try {
      const { teams, pagination } = await this.service.getAllTeams(req.validated);
      res.status(200).json({ success: true, data: teams, meta: pagination });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getTeamById(req.validated.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = await this.service.createTeam(req.validated, req.file, req.user);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id, ...payload } = req.validated;
      const data = await this.service.updateTeam(id, payload, req.file, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.service.deleteTeam(req.validated.id, req.user);
      res.status(200).json({ success: true, message: 'Team deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  assignPlayer = async (req, res, next) => {
    try {
      const { id, playerId } = req.validated;
      const data = await this.service.assignPlayer(id, playerId, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Player assigned successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  removePlayer = async (req, res, next) => {
    try {
      const { id, playerId } = req.validated;
      const data = await this.service.removePlayer(id, playerId, req.user);
      res.status(200).json({
        success: true,
        data,
        message: 'Player removed successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export { TeamController };
export default new TeamController();
