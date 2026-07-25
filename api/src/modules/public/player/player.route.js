import express from 'express';

import validateRequest from '../../../shared/middleware/validateRequest.js';
import { idParamRules, playerListRules } from '../../private/player/validators/player.validator.js';
import playerController from './player.controller.js';

class PlayerPublicRoutes {
  constructor() {
    this.router = express.Router();
    this.register();
  }

  register() {
    this.router.get('/', validateRequest(playerListRules), playerController.getAll);
    this.router.get('/:id', validateRequest(idParamRules), playerController.getById);
  }

  getRouter() {
    return this.router;
  }
}

export { PlayerPublicRoutes };
export default new PlayerPublicRoutes().getRouter();
