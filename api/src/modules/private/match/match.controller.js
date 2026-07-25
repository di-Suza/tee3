import { ScaffoldController } from '../../../shared/utils/moduleScaffold.js';
import matchService from './match.service.js';

class MatchController extends ScaffoldController {
  constructor(service = matchService) {
    super(service);
  }

  getAll = async (req, res, next) => {
    try {
      const { matches, pagination } = await this.service.getAllMatches(req.validated);
      res.status(200).json({ success: true, data: matches, meta: pagination });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getMatchById(req.validated.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = await this.service.createMatch(req.validated, req.user);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id, ...payload } = req.validated;
      const data = await this.service.updateMatch(id, payload, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req, res, next) => {
    try {
      const data = await this.service.updateMatchStatus(req.validated.id, req.validated.status, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  recordToss = async (req, res, next) => {
    try {
      const { id, ...payload } = req.validated;
      const data = await this.service.recordToss(id, payload, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  start = async (req, res, next) => {
    try {
      const data = await this.service.startMatch(req.validated.id, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  complete = async (req, res, next) => {
    try {
      const { id, ...payload } = req.validated;
      const data = await this.service.completeMatch(id, payload, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.service.deleteMatch(req.validated.id, req.user);
      res.status(200).json({ success: true, message: 'Match deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}

export { MatchController };
export default new MatchController();
