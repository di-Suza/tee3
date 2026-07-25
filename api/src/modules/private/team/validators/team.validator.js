import { body, idParamRules, objectIdRegex, query } from '../../../../shared/validators/common.js';

const TEAM_STATUSES = Object.freeze(['DRAFT', 'PUBLISHED']);

const teamNameRule = body('name')
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage('Team name must be between 2 and 80 characters');

const shortNameRule = body('shortName')
  .trim()
  .isLength({ min: 2, max: 12 })
  .withMessage('Short name must be between 2 and 12 characters');

const logoUrlRule = body('logo')
  .optional({ values: 'falsy' })
  .trim()
  .isURL({ require_protocol: true })
  .withMessage('Logo must be a valid URL');

const primaryColorRule = body('primaryColor')
  .optional({ values: 'falsy' })
  .trim()
  .isLength({ max: 32 })
  .withMessage('Primary color must be at most 32 characters');

const logoRequiredRule = body('logo').custom((value, { req }) => {
  if (!req.file && !value) {
    throw new Error('Team logo file or logo URL is required');
  }

  return true;
});

const atLeastOneUpdateFieldRule = body().custom((_value, { req }) => {
  const allowedFields = ['name', 'shortName', 'logo', 'primaryColor'];
  const hasAllowedField = allowedFields.some((field) => req.body[field] !== undefined);

  if (!req.file && !hasAllowedField) {
    throw new Error('At least one editable field or logo file is required');
  }

  return true;
});

const playerIdRule = body('playerId')
  .trim()
  .matches(objectIdRegex)
  .withMessage('Invalid player id');

const createTeamRules = [
  teamNameRule,
  shortNameRule,
  logoRequiredRule,
  logoUrlRule,
  primaryColorRule,
];

const teamListRules = [
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
  query('status')
    .optional({ values: 'falsy' })
    .isIn(TEAM_STATUSES)
    .withMessage(`Status must be one of: ${TEAM_STATUSES.join(', ')}`),
];

const updateTeamRules = [
  ...idParamRules,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Team name must be between 2 and 80 characters'),
  body('shortName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 12 })
    .withMessage('Short name must be between 2 and 12 characters'),
  logoUrlRule,
  primaryColorRule,
  atLeastOneUpdateFieldRule,
];

const teamPlayerRules = [
  ...idParamRules,
  playerIdRule,
];

export {
  createTeamRules,
  idParamRules,
  teamPlayerRules,
  teamListRules,
  TEAM_STATUSES,
  updateTeamRules,
};
