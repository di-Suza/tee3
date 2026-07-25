import User from './user.model.js';

class UserRepository {
  escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  buildPagination(pagination = {}) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;

    return {
      page,
      limit,
      skip: (page - 1) * limit,
    };
  }

  buildPaginationMeta(total, page, limit) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  create(payload) {
    return User.create(payload);
  }

  findByEmail(email, options = {}) {
    const query = User.findOne({
      email: String(email).toLowerCase(),
      isDeleted: false,
    });

    if (options.withPassword) query.select('+password');
    return query;
  }

  findById(id) {
    return User.findOne({ _id: id, isDeleted: false }).select('-password');
  }

  async findAll(filter = {}, pagination = {}) {
    const { page, limit, skip } = this.buildPagination(pagination);
    const query = { ...filter, isDeleted: false };
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  async searchByName(name, filter = {}, pagination = {}) {
    const { page, limit, skip } = this.buildPagination(pagination);
    const query = {
      ...filter,
      isDeleted: false,
      name: { $regex: this.escapeRegex(name), $options: 'i' },
    };
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: this.buildPaginationMeta(total, page, limit),
    };
  }

  updateById(id, payload) {
    return User.findOneAndUpdate({ _id: id, isDeleted: false }, payload, {
      new: true,
      runValidators: true,
    }).select('-password');
  }

  softDeleteById(id) {
    return User.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    ).select('-password');
  }
}

const userRepository = new UserRepository();

export { UserRepository };
export default userRepository;
