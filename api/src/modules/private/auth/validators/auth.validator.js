import { Roles, ROLE_LIST } from '../../../../shared/constants/roles.js';
import { body } from '../../../../shared/validators/common.js';

const registerRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .bail()
    .isIn(ROLE_LIST)
    .withMessage(`Role must be one of: ${ROLE_LIST.join(', ')}`),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export {
  registerRules,
  loginRules,
};
