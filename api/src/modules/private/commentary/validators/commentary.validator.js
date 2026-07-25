import { body, idParamRules, objectIdParam, objectIdRegex, query } from '../../../../shared/validators/common.js';
import { COMMENTARY_TYPES } from '../commentary.model.js';

const matchIdParamRules = [objectIdParam('matchId')];

const commentaryListRules = [
  ...matchIdParamRules,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  query('innings').optional({ values: 'falsy' }).isInt({ min: 1, max: 4 }).withMessage('Innings must be between 1 and 4').toInt(),
];

const createCommentaryRules = [
  ...matchIdParamRules,
  body('scoreEventId').optional({ values: 'falsy' }).trim().matches(objectIdRegex).withMessage('Score event id must be valid'),
  body('innings').optional().isInt({ min: 1, max: 4 }).withMessage('Innings must be between 1 and 4').toInt(),
  body('over').optional().isInt({ min: 0 }).withMessage('Over must be zero or greater').toInt(),
  body('ball').optional().isInt({ min: 1, max: 6 }).withMessage('Ball must be between 1 and 6').toInt(),
  body('text').trim().isLength({ min: 2, max: 500 }).withMessage('Commentary text must be between 2 and 500 characters'),
  body('type').optional().isIn(COMMENTARY_TYPES).withMessage(`Type must be one of: ${COMMENTARY_TYPES.join(', ')}`),
];

export {
  commentaryListRules,
  createCommentaryRules,
  idParamRules,
  matchIdParamRules,
};
