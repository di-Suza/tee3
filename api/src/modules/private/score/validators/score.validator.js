import { body, objectIdParam, objectIdRegex } from '../../../../shared/validators/common.js';
import { EXTRA_TYPES, WICKET_TYPES } from '../score.model.js';

const matchIdParamRules = [objectIdParam('matchId')];

const addBallRules = [
  ...matchIdParamRules,
  body('innings').isInt({ min: 1, max: 4 }).withMessage('Innings must be between 1 and 4').toInt(),
  body('battingTeam').trim().matches(objectIdRegex).withMessage('Batting team must be a valid MongoDB ObjectId'),
  body('striker').optional({ values: 'falsy' }).trim().matches(objectIdRegex).withMessage('Striker must be a valid MongoDB ObjectId'),
  body('nonStriker').optional({ values: 'falsy' }).trim().matches(objectIdRegex).withMessage('Non-striker must be a valid MongoDB ObjectId'),
  body('bowler').optional({ values: 'falsy' }).trim().matches(objectIdRegex).withMessage('Bowler must be a valid MongoDB ObjectId'),
  body('dismissedPlayer').optional({ values: 'falsy' }).trim().matches(objectIdRegex).withMessage('Dismissed player must be a valid MongoDB ObjectId'),
  body('newBatter').optional({ values: 'falsy' }).trim().matches(objectIdRegex).withMessage('New batter must be a valid MongoDB ObjectId'),
  body('runs').isInt({ min: 0, max: 6 }).withMessage('Runs must be between 0 and 6').toInt(),
  body('extras').optional().isInt({ min: 0, max: 7 }).withMessage('Extras must be between 0 and 7').toInt(),
  body('extraType').optional().isIn(EXTRA_TYPES).withMessage(`Extra type must be one of: ${EXTRA_TYPES.join(', ')}`),
  body('isWicket').optional().isBoolean().withMessage('Wicket flag must be boolean').toBoolean(),
  body('wicketType').optional({ values: 'falsy' }).isIn(WICKET_TYPES).withMessage(`Wicket type must be one of: ${WICKET_TYPES.join(', ')}`),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 240 }).withMessage('Note must be at most 240 characters'),
];

export {
  addBallRules,
  matchIdParamRules,
};
