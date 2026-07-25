import asyncHandler from '../../../shared/utils/asyncHandler.js';
import matchService from './match.service.js';

class MatchPublicController {
  constructor(service = matchService) {
    this.service = service;
    this.getAll = asyncHandler(this.getAll.bind(this));
    this.getById = asyncHandler(this.getById.bind(this));
    this.getCenter = asyncHandler(this.getCenter.bind(this));
    this.getScorecard = asyncHandler(this.getScorecard.bind(this));
  }

  async getAll(req, res) {
    const { matches, pagination } = await this.service.getMatches(req.query);
    res.json({ success: true, data: matches, meta: pagination });
  }

  async getById(req, res) {
    const data = await this.service.getMatch(req.params.matchId);
    res.json({ success: true, data });
  }

  async getCenter(req, res) {
    const data = await this.service.getMatchCenter(req.params.matchId);
    res.json({ success: true, data });
  }

  async getScorecard(req, res) {
    const data = await this.service.getScorecard(req.params.matchId);
    res.json({ success: true, data });
  }
}

export { MatchPublicController };
export default new MatchPublicController();
