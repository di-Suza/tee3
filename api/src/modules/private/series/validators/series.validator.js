import { body, idParamRules, objectIdRegex, param, query } from '../../../../shared/validators/common.js';
import { SERIES_FORMATS, SERIES_GROUPS, SERIES_MATCH_TYPES, SERIES_STATUSES } from '../series.model.js';

const teamShapeRule = (field = 'teams') =>
  body(field)
    .optional()
    .isArray()
    .withMessage('Teams must be an array')
    .custom((teams = []) => {
      teams.forEach((entry) => {
        const teamId = typeof entry === 'string' ? entry : entry?.team || entry?.teamId;
        if (!objectIdRegex.test(String(teamId || ''))) {
          throw new Error('Every selected team must have a valid team id');
        }

        if (entry?.group && !SERIES_GROUPS.includes(entry.group)) {
          throw new Error(`Team group must be one of: ${SERIES_GROUPS.join(', ')}`);
        }
      });

      return true;
    });

const seriesListRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  query('search').optional({ values: 'falsy' }).trim().isLength({ max: 80 }).withMessage('Search must be at most 80 characters'),
  query('status').optional({ values: 'falsy' }).isIn(SERIES_STATUSES).withMessage(`Status must be one of: ${SERIES_STATUSES.join(', ')}`),
  query('format').optional({ values: 'falsy' }).isIn(SERIES_FORMATS).withMessage(`Format must be one of: ${SERIES_FORMATS.join(', ')}`),
  query('matchType').optional({ values: 'falsy' }).isIn(SERIES_MATCH_TYPES).withMessage(`Match type must be one of: ${SERIES_MATCH_TYPES.join(', ')}`),
];

const createSeriesRules = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Series name must be between 2 and 120 characters'),
  body('season').trim().isLength({ min: 2, max: 40 }).withMessage('Season must be between 2 and 40 characters'),
  body('startDate').isISO8601().withMessage('Start date must be a valid date').toDate(),
  body('endDate').isISO8601().withMessage('End date must be a valid date').toDate(),
  body('format').isIn(SERIES_FORMATS).withMessage(`Format must be one of: ${SERIES_FORMATS.join(', ')}`),
  body('matchType').isIn(SERIES_MATCH_TYPES).withMessage(`Match type must be one of: ${SERIES_MATCH_TYPES.join(', ')}`),
  body('numberOfMatches').isInt({ min: 1, max: 500 }).withMessage('Number of matches must be between 1 and 500').toInt(),
  teamShapeRule('teams'),
];

const updateSeriesRules = [
  ...idParamRules,
  body('name').optional().trim().isLength({ min: 2, max: 120 }).withMessage('Series name must be between 2 and 120 characters'),
  body('season').optional().trim().isLength({ min: 2, max: 40 }).withMessage('Season must be between 2 and 40 characters'),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid date').toDate(),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid date').toDate(),
  body('format').optional().isIn(SERIES_FORMATS).withMessage(`Format must be one of: ${SERIES_FORMATS.join(', ')}`),
  body('matchType').optional().isIn(SERIES_MATCH_TYPES).withMessage(`Match type must be one of: ${SERIES_MATCH_TYPES.join(', ')}`),
  body('numberOfMatches').optional().isInt({ min: 1, max: 500 }).withMessage('Number of matches must be between 1 and 500').toInt(),
  body('status').optional().isIn(SERIES_STATUSES).withMessage(`Status must be one of: ${SERIES_STATUSES.join(', ')}`),
  teamShapeRule('teams'),
  body().custom((value) => {
    const allowed = ['name', 'season', 'startDate', 'endDate', 'format', 'matchType', 'numberOfMatches', 'status', 'teams'];
    if (!allowed.some((field) => value[field] !== undefined)) {
      throw new Error('At least one editable field is required');
    }
    return true;
  }),
];

const updateSeriesStatusRules = [
  ...idParamRules,
  body('status').isIn(SERIES_STATUSES).withMessage(`Status must be one of: ${SERIES_STATUSES.join(', ')}`),
];

const addSeriesTeamsRules = [
  ...idParamRules,
  body('teams').isArray({ min: 1 }).withMessage('At least one team is required'),
  teamShapeRule('teams'),
];

const removeSeriesTeamRules = [
  ...idParamRules,
  param('teamId').trim().matches(objectIdRegex).withMessage('Invalid team id'),
];

const seriesMatchRules = [
  ...idParamRules,
  body('team1').trim().matches(objectIdRegex).withMessage('Invalid first team id'),
  body('team2').trim().matches(objectIdRegex).withMessage('Invalid second team id'),
  body('scheduledAt').isISO8601().withMessage('Scheduled date must be a valid date').toDate(),
  body('venue').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Venue must be at most 120 characters'),
];

const updateSeriesMatchRules = [
  ...idParamRules,
  param('matchId').trim().matches(objectIdRegex).withMessage('Invalid match id'),
  body('team1').optional().trim().matches(objectIdRegex).withMessage('Invalid first team id'),
  body('team2').optional().trim().matches(objectIdRegex).withMessage('Invalid second team id'),
  body('scheduledAt').optional().isISO8601().withMessage('Scheduled date must be a valid date').toDate(),
  body('venue').optional({ values: 'falsy' }).trim().isLength({ max: 120 }).withMessage('Venue must be at most 120 characters'),
];

export {
  addSeriesTeamsRules,
  createSeriesRules,
  idParamRules,
  removeSeriesTeamRules,
  seriesListRules,
  seriesMatchRules,
  updateSeriesMatchRules,
  updateSeriesRules,
  updateSeriesStatusRules,
};
