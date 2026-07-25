const scoreFields = Object.freeze({
  required: ['matchId', 'innings', 'battingTeam'],
  optional: ['score', 'wickets', 'overs', 'runRate', 'target'],
});

export default scoreFields;
