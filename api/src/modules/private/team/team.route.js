import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import upload from '../../../shared/middleware/multer.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import { ScaffoldRoutes } from '../../../shared/utils/moduleScaffold.js';
import teamController from './team.controller.js';
import {
  createTeamRules,
  idParamRules,
  teamListRules,
  updateTeamRules,
} from './validators/team.validator.js';

class TeamRoutes extends ScaffoldRoutes {
  constructor() {
    super(teamController, {
      middlewares: [authenticate, authorize(Roles.SUPER_ADMIN, Roles.ADMIN)],
    });
  }

  register() {
    if (this.middlewares && this.middlewares.length > 0) {
      this.router.use(...this.middlewares);
    }

    this.router.get('/', validateRequest(teamListRules), this.controller.getAll);
    this.router.get('/:id', validateRequest(idParamRules), this.controller.getById);
    this.router.post('/', upload.single('logo'), validateRequest(createTeamRules), this.controller.create);
    this.router.patch('/:id', upload.single('logo'), validateRequest(updateTeamRules), this.controller.update);
    this.router.delete('/:id', validateRequest(idParamRules), this.controller.delete);
  }
}

export { TeamRoutes };
export default new TeamRoutes().getRouter();
