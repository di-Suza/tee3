import { NotFoundError } from '../../../shared/errors/index.js';
import { objectIdRegex } from '../../../shared/validators/common.js';

class PublicQueryHelper {
  static ensureId(id, entityName = 'Resource') {
    if (!objectIdRegex.test(id)) {
      throw new NotFoundError(`${entityName} not found`);
    }

    return id;
  }

  static pagination(query = {}) {
    const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(Number.parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  static escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export default PublicQueryHelper;
