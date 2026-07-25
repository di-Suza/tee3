import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import { ScaffoldRoutes } from '../../../shared/utils/moduleScaffold.js';
import matchController from './match.controller.js';
import {
  completeMatchRules,
  createMatchRules,
  idParamRules,
  matchListRules,
  recordTossRules,
  updateMatchRules,
  updateMatchStatusRules,
} from './validators/match.validator.js';

const CONTENT_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN];
const VIEW_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER];
const LIVE_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER];

class MatchRoutes extends ScaffoldRoutes {
  constructor() {
    super(matchController);
  }

  register() {
    this.router.use(authenticate);

    this.router.get('/', authorize(...VIEW_ROLES), validateRequest(matchListRules), this.controller.getAll);
    this.router.get('/:id', authorize(...VIEW_ROLES), validateRequest(idParamRules), this.controller.getById);
    this.router.post('/', authorize(...CONTENT_ROLES), validateRequest(createMatchRules), this.controller.create);
    this.router.patch('/:id/status', authorize(...LIVE_ROLES), validateRequest(updateMatchStatusRules), this.controller.updateStatus);
    this.router.patch('/:id/toss', authorize(...LIVE_ROLES), validateRequest(recordTossRules), this.controller.recordToss);
    this.router.patch('/:id/start', authorize(...LIVE_ROLES), validateRequest(idParamRules), this.controller.start);
    this.router.patch('/:id/complete', authorize(...LIVE_ROLES), validateRequest(completeMatchRules), this.controller.complete);
    this.router.patch('/:id', authorize(...CONTENT_ROLES), validateRequest(updateMatchRules), this.controller.update);
    this.router.delete('/:id', authorize(...CONTENT_ROLES), validateRequest(idParamRules), this.controller.delete);
  }
}

export { MatchRoutes };
export default new MatchRoutes().getRouter();
