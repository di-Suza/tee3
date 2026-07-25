import express from 'express';

import { Roles } from '../../../shared/constants/roles.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import userController from './user.controller.js';
import {
  idParamRules,
  paginationRules,
  searchUserRules,
  updateUserRules,
} from './validators/user.validator.js';

class UserRoutes {
  constructor() {
    this.router = express.Router();
    this.register();
  }

  register() {
    this.router.use(authenticate, authorize(Roles.SUPER_ADMIN, Roles.ADMIN));
    this.router.get('/', validateRequest(paginationRules), userController.getUsers);
    this.router.get('/search', validateRequest(searchUserRules), userController.searchUsers);
    this.router.get('/:id', validateRequest(idParamRules), userController.getUserById);
    this.router.patch('/:id', validateRequest(updateUserRules), userController.updateUser);
    this.router.delete('/:id', validateRequest(idParamRules), userController.deleteUser);
  }

  getRouter() {
    return this.router;
  }
}

export { UserRoutes };
export default new UserRoutes().getRouter();
