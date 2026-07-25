import express from 'express';

import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import squadController from './squad.controller.js';
import {
  playerIdBodyRules,
  playerIdParamRules,
  teamIdParamRules,
} from './validators/squad.validator.js';

class SquadRoutes {
  constructor() {
    this.router = express.Router({ mergeParams: true });
    this.register();
  }

  register() {
    this.router.use(authenticate, authorize(Roles.SUPER_ADMIN, Roles.ADMIN));
    this.router.get('/', validateRequest(teamIdParamRules), squadController.getSquad);
    this.router.post('/', validateRequest([...teamIdParamRules, ...playerIdBodyRules]), squadController.addPlayer);
    this.router.delete(
      '/:playerId',
      validateRequest([...teamIdParamRules, ...playerIdParamRules]),
      squadController.removePlayer
    );
  }

  getRouter() {
    return this.router;
  }
}

export { SquadRoutes };
export default new SquadRoutes().getRouter();
