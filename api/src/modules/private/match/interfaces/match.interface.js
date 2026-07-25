const matchFields = Object.freeze({
  required: ['seriesId', 'team1', 'team2', 'scheduledAt'],
  optional: ['venue', 'matchType', 'status', 'tossWinner', 'tossDecision', 'playingXI', 'winner', 'result'],
});

export default matchFields;
