import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import { ScaffoldRoutes } from '../../../shared/utils/moduleScaffold.js';
import seriesController from './series.controller.js';
import {
  addSeriesTeamsRules,
  createSeriesRules,
  idParamRules,
  removeSeriesTeamRules,
  seriesListRules,
  updateSeriesRules,
  updateSeriesStatusRules,
} from './validators/series.validator.js';

class SeriesRoutes extends ScaffoldRoutes {
  constructor() {
    super(seriesController, {
      middlewares: [authenticate, authorize(Roles.SUPER_ADMIN, Roles.ADMIN)],
    });
  }

  register() {
    if (this.middlewares.length > 0) {
      this.router.use(...this.middlewares);
    }

    this.router.get('/', validateRequest(seriesListRules), this.controller.getAll);
    this.router.get('/eligible-teams', this.controller.getEligibleTeams);
    this.router.get('/:id', validateRequest(idParamRules), this.controller.getById);
    this.router.post('/', validateRequest(createSeriesRules), this.controller.create);
    this.router.patch('/:id', validateRequest(updateSeriesRules), this.controller.update);
    this.router.patch('/:id/status', validateRequest(updateSeriesStatusRules), this.controller.updateStatus);
    this.router.delete('/:id', validateRequest(idParamRules), this.controller.delete);
    this.router.post('/:id/teams', validateRequest(addSeriesTeamsRules), this.controller.addTeams);
    this.router.delete('/:id/teams/:teamId', validateRequest(removeSeriesTeamRules), this.controller.removeTeam);
    this.router.get('/:id/matches', validateRequest(idParamRules), this.controller.getMatches);
  }
}

export { SeriesRoutes };
export default new SeriesRoutes().getRouter();
