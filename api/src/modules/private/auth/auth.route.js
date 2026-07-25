import express from 'express';
import validateRequest from '../../../shared/middleware/validateRequest.js';
import { authenticate, authorize } from '../../../shared/middleware/auth.js';
import { ADMIN, SUPER_ADMIN } from '../../../shared/constants/roles.js';
import authController from './auth.controller.js';
import { loginRules, registerRules } from './validators/auth.validator.js';

class AuthRoutes {
  constructor() {
    this.router = express.Router();
    this.register(); //it's just setup method there's nothing to do with registering a user
  }

  register() {
    this.router.post(
      '/register',
      authenticate,
      authorize(SUPER_ADMIN, ADMIN),
      validateRequest(registerRules),
      authController.register
    );
    this.router.post('/login', validateRequest(loginRules), authController.login);
    this.router.post('/refresh', authController.refresh);
    this.router.post('/logout', authenticate, authController.logout);
    this.router.get('/me', authenticate, authController.getMe);
  }

  getRouter() {
    return this.router;
  }
}

export { AuthRoutes };
export default new AuthRoutes().getRouter();