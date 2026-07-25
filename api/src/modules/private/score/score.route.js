import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import { ScaffoldRoutes } from '../../../shared/utils/moduleScaffold.js';
import scoreController from './score.controller.js';
import { addBallRules, matchIdParamRules } from './validators/score.validator.js';

const VIEW_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER];
const LIVE_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER];

class ScoreRoutes extends ScaffoldRoutes {
  constructor() {
    super(scoreController, {
      mergeParams: true,
      middlewares: [authenticate],
    });
  }

  register() {
    if (this.middlewares.length > 0) {
      this.router.use(...this.middlewares);
    }

    this.router.get('/', authorize(...VIEW_ROLES), validateRequest(matchIdParamRules), this.controller.getScoreboard);
    this.router.post('/ball', authorize(...LIVE_ROLES), validateRequest(addBallRules), this.controller.addBall);
  }
}

export { ScoreRoutes };
export default new ScoreRoutes().getRouter();
