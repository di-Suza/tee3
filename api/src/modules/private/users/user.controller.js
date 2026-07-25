import asyncHandler from '../../../shared/utils/asyncHandler.js';
import userService from './user.service.js';

class UserController {
  constructor(service = userService) {
    this.service = service;
    this.getUsers = asyncHandler(this.getUsers.bind(this));
    this.searchUsers = asyncHandler(this.searchUsers.bind(this));
    this.getUserById = asyncHandler(this.getUserById.bind(this));
    this.updateUser = asyncHandler(this.updateUser.bind(this));
    this.deleteUser = asyncHandler(this.deleteUser.bind(this));
  }

  async getUsers(req, res) {
    const { users, pagination } = await this.service.getUsers(req.user, req.validated);
    res.json({ success: true, data: users, meta: pagination });
  }

  async searchUsers(req, res) {
    const { users, pagination } = await this.service.searchUsers(req.user, req.validated);
    res.json({ success: true, data: users, meta: pagination });
  }

  async getUserById(req, res) {
    const user = await this.service.getUserById(req.validated.id, req.user);
    res.json({ success: true, data: user });
  }

  async updateUser(req, res) {
    const { id, ...payload } = req.validated;
    const user = await this.service.updateUser(id, payload, req.user);
    res.json({ success: true, data: user });
  }

  async deleteUser(req, res) {
    const data = await this.service.deleteUser(req.validated.id, req.user);
    res.json({ success: true, data });
  }
}

const userController = new UserController();

export { UserController };
export default userController;
