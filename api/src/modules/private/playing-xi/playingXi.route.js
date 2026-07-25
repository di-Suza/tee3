import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import { ScaffoldRoutes } from '../../../shared/utils/moduleScaffold.js';
import playingXiController from './playingXi.controller.js';
import { matchIdParamRules, selectPlayingXiRules } from './validators/playingXi.validator.js';

const VIEW_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER];
const LIVE_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER];

class PlayingXiRoutes extends ScaffoldRoutes {
  constructor() {
    super(playingXiController, {
      mergeParams: true,
      middlewares: [authenticate],
    });
  }

  register() {
    if (this.middlewares.length > 0) {
      this.router.use(...this.middlewares);
    }

    this.router.get('/', authorize(...VIEW_ROLES), validateRequest(matchIdParamRules), this.controller.getSelection);
    this.router.post('/', authorize(...LIVE_ROLES), validateRequest(selectPlayingXiRules), this.controller.select);
  }
}

export { PlayingXiRoutes };
export default new PlayingXiRoutes().getRouter();
