import { ScaffoldController } from '../../../shared/utils/moduleScaffold.js';
import seriesService from './series.service.js';

class SeriesController extends ScaffoldController {
  constructor(service = seriesService) {
    super(service);
  }

  getAll = async (req, res, next) => {
    try {
      const { series, pagination } = await this.service.getAllSeries(req.validated);
      res.status(200).json({ success: true, data: series, meta: pagination });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const data = await this.service.getSeriesById(req.validated.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getEligibleTeams = async (_req, res, next) => {
    try {
      const data = await this.service.getEligibleTeams();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const data = await this.service.createSeries(req.validated, req.user);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id, ...payload } = req.validated;
      const data = await this.service.updateSeries(id, payload, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req, res, next) => {
    try {
      const data = await this.service.updateStatus(req.validated.id, req.validated.status, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.service.deleteSeries(req.validated.id, req.user);
      res.status(200).json({ success: true, message: 'Series deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  addTeams = async (req, res, next) => {
    try {
      const data = await this.service.addTeams(req.validated.id, req.validated.teams, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  removeTeam = async (req, res, next) => {
    try {
      const data = await this.service.removeTeam(req.validated.id, req.validated.teamId, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  getMatches = async (req, res, next) => {
    try {
      const data = await this.service.getSeriesMatches(req.validated.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  createMatch = async (req, res, next) => {
    try {
      const { id, ...payload } = req.validated;
      const data = await this.service.createSeriesMatch(id, payload, req.user);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  updateMatch = async (req, res, next) => {
    try {
      const { id, matchId, ...payload } = req.validated;
      const data = await this.service.updateSeriesMatch(id, matchId, payload, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export { SeriesController };
export default new SeriesController();
