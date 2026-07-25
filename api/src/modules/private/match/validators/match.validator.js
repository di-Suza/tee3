import { body, idParamRules, objectIdRegex, query } from '../../../../shared/validators/common.js';
import { MATCH_STATUS_LIST } from '../../../../shared/constants/matchStatus.js';
import { SERIES_MATCH_TYPES, TOSS_DECISIONS } from '../../series/series.model.js';

const objectIdBodyRule = (field, label) =>
  body(field)
    .trim()
    .matches(objectIdRegex)
    .withMessage(`${label} must be a valid MongoDB ObjectId`);

const optionalObjectIdBodyRule = (field, label) =>
  body(field)
    .optional()
    .trim()
    .matches(objectIdRegex)
    .withMessage(`${label} must be a valid MongoDB ObjectId`);

const matchListRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  query('seriesId').optional({ values: 'falsy' }).matches(objectIdRegex).withMessage('Series id must be valid'),
  query('status').optional({ values: 'falsy' }).isIn(MATCH_STATUS_LIST).withMessage(`Status must be one of: ${MATCH_STATUS_LIST.join(', ')}`),
  query('matchType').optional({ values: 'falsy' }).isIn(SERIES_MATCH_TYPES).withMessage(`Match type must be one of: ${SERIES_MATCH_TYPES.join(', ')}`),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Search must be at most 120 characters'),
];

const createMatchRules = [
  objectIdBodyRule('seriesId', 'Series id'),
  objectIdBodyRule('team1', 'First team id'),
  objectIdBodyRule('team2', 'Second team id'),
  body('scheduledAt').isISO8601().withMessage('Scheduled date must be a valid date').toDate(),
  body('venue').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Venue must be at most 120 characters'),
];

const updateMatchRules = [
  ...idParamRules,
  optionalObjectIdBodyRule('team1', 'First team id'),
  optionalObjectIdBodyRule('team2', 'Second team id'),
  body('scheduledAt').optional().isISO8601().withMessage('Scheduled date must be a valid date').toDate(),
  body('venue').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Venue must be at most 120 characters'),
  body().custom((value) => {
    const allowed = ['team1', 'team2', 'scheduledAt', 'venue'];
    if (!allowed.some((field) => value[field] !== undefined)) {
      throw new Error('At least one editable field is required');
    }
    return true;
  }),
];

const updateMatchStatusRules = [
  ...idParamRules,
  body('status').isIn(MATCH_STATUS_LIST).withMessage(`Status must be one of: ${MATCH_STATUS_LIST.join(', ')}`),
];

const recordTossRules = [
  ...idParamRules,
  objectIdBodyRule('tossWinner', 'Toss winner'),
  body('tossDecision').isIn(TOSS_DECISIONS).withMessage(`Toss decision must be one of: ${TOSS_DECISIONS.join(', ')}`),
];

const completeMatchRules = [
  ...idParamRules,
  objectIdBodyRule('winner', 'Winner'),
  body('result').trim().isLength({ min: 2, max: 160 }).withMessage('Result must be between 2 and 160 characters'),
];

export {
  completeMatchRules,
  createMatchRules,
  idParamRules,
  matchListRules,
  recordTossRules,
  updateMatchRules,
  updateMatchStatusRules,
};
