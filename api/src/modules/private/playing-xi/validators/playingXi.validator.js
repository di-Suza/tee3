import { body, objectIdParam, objectIdRegex } from '../../../../shared/validators/common.js';

const matchIdParamRules = [objectIdParam('matchId')];

const lineupRules = (field, label) => [
  body(field).isArray({ min: 11, max: 11 }).withMessage(`${label} must include exactly 11 players`),
  body(`${field}.*.player`)
    .trim()
    .matches(objectIdRegex)
    .withMessage(`${label} player id must be valid`),
  body(`${field}.*.isCaptain`).optional().isBoolean().withMessage(`${label} captain flag must be boolean`).toBoolean(),
  body(`${field}.*.isWicketKeeper`).optional().isBoolean().withMessage(`${label} wicket keeper flag must be boolean`).toBoolean(),
];

const selectPlayingXiRules = [
  ...matchIdParamRules,
  ...lineupRules('team1', 'Team 1'),
  ...lineupRules('team2', 'Team 2'),
];

export {
  matchIdParamRules,
  selectPlayingXiRules,
};
