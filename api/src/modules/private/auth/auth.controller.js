import AuthCookie from '../../../shared/utils/authCookie.js';
import asyncHandler from '../../../shared/utils/asyncHandler.js'; 
import authService from './auth.service.js';
import authSessionService from './session/authSession.service.js';

class AuthController {
  constructor(service = authService, sessionService = authSessionService) {
    this.sessionService = sessionService;
    this.service = service;
    this.register = asyncHandler(this.register.bind(this));
    this.login = asyncHandler(this.login.bind(this));
    this.refresh = asyncHandler(this.refresh.bind(this));
    this.logout = asyncHandler(this.logout.bind(this));
    this.getMe = asyncHandler(this.getMe.bind(this));
  }

  async register(req, res) {
    const data = await this.service.register(req.validated, req.user);
    res.status(201).json({ success: true, data });
  }

  async login(req, res) {
    const reqMeta = this.sessionService.getRequestMeta(req);
    const data = await this.service.login(req.body, reqMeta);
    AuthCookie.setRefreshToken(res, data.refreshToken);
    res.json({ success: true, data: { user: data.user, accessToken: data.accessToken } });
  }

  async refresh(req, res) {
    const refreshToken = AuthCookie.getRefreshToken(req);
    const data = await this.service.refresh(refreshToken);
    res.json({ success: true, data });
  }

  async logout(req, res) {
    const refreshToken = AuthCookie.getRefreshToken(req);
    const data = await this.service.logout(refreshToken);
    AuthCookie.clearRefreshToken(res);
    res.json({ success: true, data });
  }

  async getMe(req, res) {
    const user = await this.service.getMe(req.user.id);
    res.json({ success: true, data: { user } });
  }
}

const authController = new AuthController();

export { AuthController };
export default authController;