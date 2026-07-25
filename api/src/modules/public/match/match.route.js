import express from 'express';
import matchController from './match.controller.js';

class MatchPublicRoutes {
  constructor() {
    this.router = express.Router();
    this.register();
  }

  register() {
    this.router.get('/', matchController.getAll);
    this.router.get('/:matchId/center', matchController.getCenter);
    this.router.get('/:matchId/scorecard', matchController.getScorecard);
    this.router.get('/:matchId', matchController.getById);
  }

  getRouter() {
    return this.router;
  }
}

export { MatchPublicRoutes };
export default new MatchPublicRoutes().getRouter();
