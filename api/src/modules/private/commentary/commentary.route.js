import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import { ScaffoldRoutes } from '../../../shared/utils/moduleScaffold.js';
import commentaryController from './commentary.controller.js';
import { commentaryListRules, createCommentaryRules, idParamRules } from './validators/commentary.validator.js';

const VIEW_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER];
const LIVE_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER];

class CommentaryRoutes extends ScaffoldRoutes {
  constructor() {
    super(commentaryController, {
      mergeParams: true,
      middlewares: [authenticate],
    });
  }

  register() {
    if (this.middlewares.length > 0) {
      this.router.use(...this.middlewares);
    }

    this.router.get('/', authorize(...VIEW_ROLES), validateRequest(commentaryListRules), this.controller.getAll);
    this.router.post('/', authorize(...LIVE_ROLES), validateRequest(createCommentaryRules), this.controller.create);
    this.router.delete('/:id', authorize(...LIVE_ROLES), validateRequest(idParamRules), this.controller.delete);
  }
}

export { CommentaryRoutes };
export default new CommentaryRoutes().getRouter();
