import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../shared/errors/index.js';
import { Roles } from '../../../shared/constants/roles.js';
import authSessionService from '../auth/session/authSession.service.js';
import userRepository from './user.repository.js';

class UserService {
  constructor(repository = userRepository, sessionService = authSessionService) {
    this.repository = repository;
    this.sessionService = sessionService;
  }

  getPagination(query = {}) {
    return {
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  getManageableRoleFilter(requester) {
    if (requester.role === Roles.SUPER_ADMIN) {
      return { role: { $in: [Roles.ADMIN, Roles.SCORER] } };
    }

    if (requester.role === Roles.ADMIN) {
      return { role: Roles.SCORER };
    }

    throw new ForbiddenError('You do not have permission to manage users');
  }

  ensureCanManageUser(requester, user, nextRole = user?.role) {
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (requester.role === Roles.SUPER_ADMIN && [Roles.ADMIN, Roles.SCORER].includes(user.role)) {
      return;
    }

    if (requester.role === Roles.ADMIN && user.role === Roles.SCORER && nextRole === Roles.SCORER) {
      return;
    }

    throw new ForbiddenError('You do not have permission to manage this user');
  }

  sanitizeUpdatePayload(payload) {
    const allowedFields = ['name', 'email', 'role'];
    const updatePayload = {};

    allowedFields.forEach((field) => {
      if (payload[field] !== undefined) {
        updatePayload[field] = payload[field];
      }
    });

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestError('At least one editable field is required');
    }

    return updatePayload;
  }

  async ensureEmailIsAvailable(email, currentUserId) {
    if (!email) return;

    const existingUser = await this.repository.findByEmail(email);

    if (existingUser && existingUser._id.toString() !== currentUserId.toString()) {
      throw new ConflictError('Email already registered');
    }
  }

  getUsers(requester, query = {}) {
    return this.repository.findAll(this.getManageableRoleFilter(requester), this.getPagination(query));
  }

  searchUsers(requester, query = {}) {
    return this.repository.searchByName(
      query.name,
      this.getManageableRoleFilter(requester),
      this.getPagination(query)
    );
  }

  async getUserById(id, requester) {
    const user = await this.repository.findById(id);

    this.ensureCanManageUser(requester, user);

    return user;
  }

  async updateUser(id, payload, requester) {
    const user = await this.repository.findById(id);
    const updatePayload = this.sanitizeUpdatePayload(payload);

    this.ensureCanManageUser(requester, user, updatePayload.role || user?.role);
    await this.ensureEmailIsAvailable(updatePayload.email, user._id);

    const updatedUser = await this.repository.updateById(id, updatePayload);

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    return updatedUser;
  }

  async deleteUser(id, requester) {
    const user = await this.repository.findById(id);

    this.ensureCanManageUser(requester, user);

    const deletedUser = await this.repository.softDeleteById(id);

    if (!deletedUser) {
      throw new NotFoundError('User not found');
    }

    await this.sessionService.revokeAllUserSessions(deletedUser._id, 'USER_DELETED');

    return {
      user: deletedUser,
      message: 'User deleted successfully',
    };
  }
}

const userService = new UserService();

export { UserService };
export default userService;
