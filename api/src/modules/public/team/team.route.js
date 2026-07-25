import express from 'express';

import validateRequest from '../../../shared/middleware/validateRequest.js';
import { idParamRules, teamListRules } from '../../private/team/validators/team.validator.js';
import teamController from './team.controller.js';

class TeamPublicRoutes {
  constructor() {
    this.router = express.Router();
    this.register();
  }

  register() {
    this.router.get('/', validateRequest(teamListRules), teamController.getAll);
    this.router.get('/:id', validateRequest(idParamRules), teamController.getById);
  }

  getRouter() {
    return this.router;
  }
}

export { TeamPublicRoutes };
export default new TeamPublicRoutes().getRouter();
