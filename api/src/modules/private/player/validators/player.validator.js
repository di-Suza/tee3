import { body, idParamRules, objectIdRegex, query } from '../../../../shared/validators/common.js';
import {
  PLAYER_BATTING_STYLES,
  PLAYER_BOWLING_STYLES,
  PLAYER_ROLES,
} from '../player.constants.js';

const nameRule = body('name')
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage('Player name must be between 2 and 80 characters');

const roleRule = body('role')
  .isIn(PLAYER_ROLES)
  .withMessage(`Role must be one of: ${PLAYER_ROLES.join(', ')}`);

const countryRule = body('country')
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage('Country must be between 2 and 80 characters');

const imageRule = body('image')
  .optional({ values: 'falsy' })
  .trim()
  .isURL({ require_protocol: true })
  .withMessage('Image must be a valid URL');

const requiredStyleRule = (field, label, allowedValues) =>
  body(field)
    .trim()
    .isIn(allowedValues)
    .withMessage(`${label} must be one of: ${allowedValues.join(', ')}`);

const optionalStyleRule = (field, label, allowedValues) =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .isIn(allowedValues)
    .withMessage(`${label} must be one of: ${allowedValues.join(', ')}`);

const atLeastOneUpdateFieldRule = body().custom((_value, { req }) => {
  const allowedFields = ['name', 'image', 'role', 'country', 'battingStyle', 'bowlingStyle'];
  const hasAllowedField = allowedFields.some((field) => req.body[field] !== undefined);

  if (!req.file && !hasAllowedField) {
    throw new Error('At least one editable field or image file is required');
  }

  return true;
});

const createPlayerRules = [
  nameRule,
  roleRule,
  countryRule,
  imageRule,
  requiredStyleRule('battingStyle', 'Batting style', PLAYER_BATTING_STYLES),
  optionalStyleRule('bowlingStyle', 'Bowling style', PLAYER_BOWLING_STYLES),
];

const playerListRules = [
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
  query('search')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Search must be at most 80 characters'),
  query('role')
    .optional({ values: 'falsy' })
    .isIn(PLAYER_ROLES)
    .withMessage(`Role must be one of: ${PLAYER_ROLES.join(', ')}`),
  query('country')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('Country must be at most 80 characters'),
  query('availableForTeam')
    .optional({ values: 'falsy' })
    .matches(objectIdRegex)
    .withMessage('Available team id must be a valid MongoDB ObjectId'),
];

const updatePlayerRules = [
  ...idParamRules,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Player name must be between 2 and 80 characters'),
  body('role')
    .optional()
    .isIn(PLAYER_ROLES)
    .withMessage(`Role must be one of: ${PLAYER_ROLES.join(', ')}`),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Country must be between 2 and 80 characters'),
  imageRule,
  optionalStyleRule('battingStyle', 'Batting style', PLAYER_BATTING_STYLES),
  optionalStyleRule('bowlingStyle', 'Bowling style', PLAYER_BOWLING_STYLES),
  atLeastOneUpdateFieldRule,
];

export {
  PLAYER_BATTING_STYLES,
  PLAYER_BOWLING_STYLES,
  createPlayerRules,
  idParamRules,
  playerListRules,
  PLAYER_ROLES,
  updatePlayerRules,
};
