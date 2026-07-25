import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import upload from '../../../shared/middleware/multer.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import { ScaffoldRoutes } from '../../../shared/utils/moduleScaffold.js';
import playerController from './player.controller.js';
import {
  createPlayerRules,
  idParamRules,
  playerListRules,
  updatePlayerRules,
} from './validators/player.validator.js';

class PlayerRoutes extends ScaffoldRoutes {
  constructor() {
    super(playerController, {
      middlewares: [authenticate, authorize(Roles.SUPER_ADMIN, Roles.ADMIN)],
    });
  }

  register() {
    if (this.middlewares && this.middlewares.length > 0) {
      this.router.use(...this.middlewares);
    }

    this.router.get('/', validateRequest(playerListRules), this.controller.getAll);
    this.router.get('/:id', validateRequest(idParamRules), this.controller.getById);
    this.router.post('/', upload.single('image'), validateRequest(createPlayerRules), this.controller.create);
    this.router.patch('/:id', upload.single('image'), validateRequest(updatePlayerRules), this.controller.update);
    this.router.delete('/:id', validateRequest(idParamRules), this.controller.delete);
  }
}

export { PlayerRoutes };
export default new PlayerRoutes().getRouter();
