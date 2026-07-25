import { ADMIN, SCORER } from '../../../../shared/constants/roles.js';
import { body, idParamRules, query } from '../../../../shared/validators/common.js';

const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

const searchUserRules = [
  ...paginationRules,
  query('name')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Search name must be between 1 and 80 characters'),
];

const updateUserRules = [
  ...idParamRules,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),
  body('email').optional().trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('role')
    .optional()
    .isIn([ADMIN, SCORER])
    .withMessage(`Role must be one of: ${ADMIN}, ${SCORER}`),
  body().custom((_value, { req }) => {
    const allowedFields = ['name', 'email', 'role'];
    const hasAllowedField = allowedFields.some((field) => req.body[field] !== undefined);

    if (!hasAllowedField) {
      throw new Error('At least one editable field is required');
    }

    return true;
  }),
];

export {
  idParamRules,
  paginationRules,
  searchUserRules,
  updateUserRules,
};
