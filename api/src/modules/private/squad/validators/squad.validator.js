import { body, objectIdParam } from '../../../../shared/validators/common.js';

const teamIdParamRules = [objectIdParam('teamId')];
const playerIdParamRules = [objectIdParam('playerId')];
const playerIdBodyRules = [
  body('playerId')
    .trim()
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid player id'),
];

export {
  playerIdBodyRules,
  playerIdParamRules,
  teamIdParamRules,
};
