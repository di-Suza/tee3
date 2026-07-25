import bcrypt from 'bcryptjs';

import { Roles } from '../../../shared/constants/roles.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../../shared/errors/index.js';
import jwtTokenService from '../../../shared/utils/jwtToken.js';
import userRepository from '../users/user.repository.js';
import authSessionService from './session/authSession.service.js';

class AuthService {
  constructor(repository = userRepository, sessionService = authSessionService) {
    this.repository = repository;
    this.sessionService = sessionService;
  }

  signAccessToken(user) {
    return jwtTokenService.signAccessToken(user);
  }

  signRefreshToken(user) {
    return jwtTokenService.signRefreshToken(user);
  }

  ensureCanCreateRole(requester, targetRole) {
    if (!requester) {
      throw new UnauthorizedError('Authentication required');
    }

    if (targetRole === Roles.SUPER_ADMIN) {
      throw new ForbiddenError('Super admin can only be created by seed command');
    }

    if (requester.role === Roles.SUPER_ADMIN && [Roles.ADMIN, Roles.SCORER].includes(targetRole)) {
      return;
    }

    if (requester.role === Roles.ADMIN && targetRole === Roles.SCORER) {
      return;
    }

    throw new ForbiddenError('You do not have permission to create this role');
  }

  sanitizeUser(user) {
    const data = user.toObject ? user.toObject() : { ...user };
    delete data.password;
    delete data.__v;
    return data;
  }

  
  async register(payload, requester) {
    this.ensureCanCreateRole(requester, payload.role);

    const existingUser = await this.repository.findByEmail(payload.email);

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const password = await bcrypt.hash(payload.password, 10);
    const user = await this.repository.create({ ...payload, password });

    return {
      user: this.sanitizeUser(user),
      message: 'User created successfully',
    };
  }

  async login(payload, meta) {
    const user = await this.repository.findByEmail(payload.email, { withPassword: true });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);

    await this.sessionService.createSession(user, refreshToken, meta);

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken) {
    const session = await this.sessionService.findValidSession(refreshToken);
    const user = await this.repository.findById(session.userId);

    if (!user) {
      throw new UnauthorizedError('Refresh session user is invalid');
    }

    return {
      accessToken: this.signAccessToken(user),
    };
  }

  async logout(refreshToken) {
    await this.sessionService.revokeSession(refreshToken, 'LOGOUT');

    return {
      message: 'Logged out successfully',
    };
  }
  async getMe(userId) {
    const user = await this.repository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.sanitizeUser(user);
  }
}

const authService = new AuthService();

export { AuthService };
export default authService;
