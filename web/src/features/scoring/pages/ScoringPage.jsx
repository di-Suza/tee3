import { useEffect, useMemo, useState } from 'react';

import LoadingLabel from '../../../shared/components/LoadingLabel.jsx';
import LoadingState from '../../../shared/components/LoadingState.jsx';
import { useToast } from '../../../shared/components/ToastProvider.jsx';
import { getSocket } from '../../../shared/socket/socketClient.js';
import { useGetHomeStatusQuery } from '../../home/api/homeApi.js';
import { useAddScoreBallMutation, useGetScoreboardQuery } from '../api/scoringApi.js';

const RUN_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const EXTRA_TYPES = ['NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'];
const WICKET_TYPES = ['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET', 'RETIRED_HURT', 'OTHER'];
const EMPTY_ARRAY = Object.freeze([]);
const MATCH_SCORING_RULES = {
  T20: { maxInnings: 2, maxBallsPerInnings: 120, maxOvers: 20 },
  ODI: { maxInnings: 2, maxBallsPerInnings: 300, maxOvers: 50 },
  TEST: { maxInnings: 4, maxBallsPerInnings: null, maxOvers: null },
};

function getTeamId(team) { return String(team?._id || team?.id || team || ''); }
function getTeamName(team) { return team?.shortName || team?.name || 'Team'; }
function getPlayerName(player) { return player?.name || 'Player'; }
function getPlayerId(player) { return String(player?._id || player?.id || player?.player?._id || player?.player || player || ''); }

function getScoringRules(match) { return MATCH_SCORING_RULES[match?.matchType] || MATCH_SCORING_RULES.T20; }

function isInningsComplete(score, rules) {
  if (!score) return false;
  if (score.wickets >= 10) return true;
  if (rules.maxBallsPerInnings && score.balls >= rules.maxBallsPerInnings) return true;
  if (score.target && score.runs >= score.target) return true;
  return false;
}

function getScoreByInnings(scores = [], innings) { return scores.find((score) => Number(score.innings) === Number(innings)) || null; }

function getAvailableInnings(scores = [], rules) {
  return Array.from({ length: rules.maxInnings }, (_, index) => index + 1).filter((innings) => {
    if (innings === 1) return true;
    return isInningsComplete(getScoreByInnings(scores, innings - 1), rules);
  });
}

function getOppositeTeam(teams = [], teamId) { return teams.find((team) => getTeamId(team) !== String(teamId)) || null; }

function getTossBattingTeam(match, teams = []) {
  if (!match?.tossWinner || !match?.tossDecision) return null;
  const tossWinnerId = getTeamId(match.tossWinner);
  if (match.tossDecision === 'BAT') {
    return teams.find((team) => getTeamId(team) === tossWinnerId) || match.tossWinner;
  }
  return getOppositeTeam(teams, tossWinnerId);
}

function getPlayingXiForTeam(match, teamId) {
  if (!match || !teamId) return [];
  if (String(teamId) === getTeamId(match.team1)) return match.playingXI?.team1 || [];
  if (String(teamId) === getTeamId(match.team2)) return match.playingXI?.team2 || [];
  return [];
}

function getLineupPlayers(match, teamId) { return getPlayingXiForTeam(match, teamId).map((entry) => entry.player).filter(Boolean); }
function hasPlayer(players = [], playerId) { return players.some((player) => getPlayerId(player) === String(playerId)); }
function findPlayer(players = [], playerId) { return players.find((player) => getPlayerId(player) === String(playerId)) || null; }
function getPlayerStat(stats = [], playerId) { return stats.find((row) => getPlayerId(row.player) === String(playerId)) || null; }
function createEmptyBattingStat(player, isOut = false) { return { player, runs: 0, balls: 0, fours: 0, sixes: 0, isOut }; }
function createEmptyBowlingStat(player) { return { player, overs: '0.0', runsConceded: 0, wickets: 0 }; }

function ScoringPage() {
  const toast = useToast();
  const [activeMatchId, setActiveMatchId] = useState('');
  const [localDismissedByInnings, setLocalDismissedByInnings] = useState({});
  const [form, setForm] = useState({
    innings: 1,
    battingTeam: '',
    striker: '',
    nonStriker: '',
    bowler: '',
    runs: 0,
    extras: 0,
    extraType: 'NONE',
    isWicket: false,
    dismissedPlayer: '',
    newBatter: '',
    wicketType: 'OTHER',
    note: '',
  });

  const { data: homeStatus, isLoading: isMatchesLoading, refetch: refetchMatches } = useGetHomeStatusQuery();
  const liveMatches = homeStatus?.liveMatches || [];
  const {
    data: scoreboard,
    isLoading: isScoreLoading,
    isFetching: isScoreFetching,
    refetch: refetchScoreboard,
  } = useGetScoreboardQuery(activeMatchId, { skip: !activeMatchId });
  const [addScoreBall, addState] = useAddScoreBallMutation();

  const activeMatch = scoreboard?.match || liveMatches.find((match) => String(match._id) === String(activeMatchId)) || null;
  const teams = useMemo(() => [activeMatch?.team1, activeMatch?.team2].filter(Boolean), [activeMatch]);
  const scoresByInnings = scoreboard?.scores || [];
  const recentEvents = scoreboard?.recentEvents || [];
  const scoringRules = useMemo(() => getScoringRules(activeMatch), [activeMatch]);
  const availableInnings = useMemo(() => getAvailableInnings(scoresByInnings, scoringRules), [scoresByInnings, scoringRules]);
  const selectedInnings = Number(form.innings);
  const selectedScore = getScoreByInnings(scoresByInnings, selectedInnings);
  const previousScore = selectedInnings > 1 ? getScoreByInnings(scoresByInnings, selectedInnings - 1) : null;
  const isSelectedInningsAvailable = availableInnings.includes(selectedInnings);
  const isSelectedInningsComplete = isInningsComplete(selectedScore, scoringRules);

  const expectedBattingTeam = useMemo(
    () => (
      selectedInnings === 1
        ? getTossBattingTeam(activeMatch, teams)
        : selectedInnings === 2 && ['T20', 'ODI'].includes(activeMatch?.matchType)
          ? getOppositeTeam(teams, getTeamId(getScoreByInnings(scoresByInnings, 1)?.battingTeam))
          : null
    ),
    [activeMatch, scoresByInnings, selectedInnings, teams]
  );

  const lockedBattingTeam = selectedScore?.battingTeam || expectedBattingTeam;
  const isBattingTeamLocked = Boolean(lockedBattingTeam);
  const bowlingTeam = useMemo(() => getOppositeTeam(teams, form.battingTeam), [form.battingTeam, teams]);
  const battingPlayers = useMemo(() => getLineupPlayers(activeMatch, form.battingTeam), [activeMatch, form.battingTeam]);
  const bowlingPlayers = useMemo(() => getLineupPlayers(activeMatch, getTeamId(bowlingTeam)), [activeMatch, bowlingTeam]);
  const inningsStats = useMemo(
    () => (scoreboard?.stats || []).find((entry) => Number(entry.innings) === selectedInnings) || null,
    [scoreboard?.stats, selectedInnings]
  );
  const inningsPlayerMeta = useMemo(
    () => (scoreboard?.inningsPlayerMeta || []).find((entry) => Number(entry.innings) === selectedInnings) || null,
    [scoreboard?.inningsPlayerMeta, selectedInnings]
  );
  const battingStats = inningsStats?.batting || EMPTY_ARRAY;
  const bowlingStats = inningsStats?.bowling || EMPTY_ARRAY;
  const metaDismissedIds = inningsPlayerMeta?.dismissedPlayerIds || EMPTY_ARRAY;
  const recentDismissedIds = useMemo(
    () => recentEvents
      .filter((event) => Number(event.innings) === selectedInnings && event.dismissedPlayer)
      .map((event) => getPlayerId(event.dismissedPlayer)),
    [recentEvents, selectedInnings]
  );
  const localDismissedIds = localDismissedByInnings[selectedInnings] || EMPTY_ARRAY;
  const dismissedBatterIds = useMemo(
    () => new Set([
      ...battingStats.filter((row) => row.isOut).map((row) => getPlayerId(row.player)),
      ...metaDismissedIds.map((playerId) => String(playerId)),
      ...recentDismissedIds,
      ...localDismissedIds,
    ]),
    [battingStats, localDismissedIds, metaDismissedIds, recentDismissedIds]
  );
  const availableBatters = useMemo(
    () => battingPlayers.filter((player) => !dismissedBatterIds.has(getPlayerId(player))),
    [battingPlayers, dismissedBatterIds]
  );
  const newBatterSource = inningsPlayerMeta ? (inningsPlayerMeta.availableNewBatters || EMPTY_ARRAY) : battingPlayers;
  const newBatterOptions = useMemo(
    () => newBatterSource.filter((player) => {
      const playerId = getPlayerId(player);
      return playerId
        && !dismissedBatterIds.has(playerId)
        && ![form.striker, form.nonStriker].includes(playerId);
    }),
    [dismissedBatterIds, form.nonStriker, form.striker, newBatterSource]
  );
  const battingRows = useMemo(
    () => (battingStats.length > 0
      ? battingStats
      : battingPlayers.map((player) => createEmptyBattingStat(player, dismissedBatterIds.has(getPlayerId(player))))),
    [battingPlayers, battingStats, dismissedBatterIds]
  );
  const bowlingRows = useMemo(
    () => (bowlingStats.length > 0 ? bowlingStats : bowlingPlayers.map((player) => createEmptyBowlingStat(player))),
    [bowlingPlayers, bowlingStats]
  );
  const strikerPlayer = findPlayer(battingPlayers, form.striker);
  const nonStrikerPlayer = findPlayer(battingPlayers, form.nonStriker);
  const strikerStat = getPlayerStat(battingRows, form.striker);
  const nonStrikerStat = getPlayerStat(battingRows, form.nonStriker);

  const bowlerPlayer = findPlayer(bowlingPlayers, form.bowler);
  const bowlerStat = getPlayerStat(bowlingRows, form.bowler);

  const isBattingPairLocked = Boolean(selectedScore?.currentStriker && selectedScore?.currentNonStriker);
  const needsNewBatter = Boolean(form.isWicket && (selectedScore?.wickets || 0) < 9);
  const canAddBall = Boolean(
    activeMatchId
    && form.battingTeam
    && form.striker
    && form.nonStriker
    && form.bowler
    && form.striker !== form.nonStriker
    && hasPlayer(availableBatters, form.striker)
    && hasPlayer(availableBatters, form.nonStriker)
    && (!needsNewBatter || (
      form.newBatter
      && hasPlayer(newBatterOptions, form.newBatter)
      && ![form.striker, form.nonStriker].includes(String(form.newBatter))
    ))
    && isSelectedInningsAvailable
    && !isSelectedInningsComplete
  );

  // Derive "This Over"
  const currentOverNumber = useMemo(() => {
    if (!selectedScore) return 0;
    const balls = selectedScore.balls || 0;
    if (balls > 0 && balls % 6 === 0) {
      return Math.floor(balls / 6) - 1; // Show the just-completed over until the next ball is bowled
    }
    return Math.floor(parseFloat(selectedScore.overs || '0'));
  }, [selectedScore]);

  const thisOverEvents = useMemo(() => {
    if (!selectedScore) return [];
    return recentEvents.filter(e => Math.floor(parseFloat(e.over || '0')) === currentOverNumber && e.innings === selectedInnings).reverse();
  }, [recentEvents, currentOverNumber, selectedInnings, selectedScore]);

  useEffect(() => {
    if (!activeMatchId && liveMatches.length > 0) {
      setActiveMatchId(liveMatches[0]._id);
    }
  }, [activeMatchId, liveMatches]);

  useEffect(() => {
    setLocalDismissedByInnings({});
  }, [activeMatchId]);

  useEffect(() => {
    if (!availableInnings.includes(Number(form.innings))) {
      setForm((current) => ({ ...current, innings: availableInnings[availableInnings.length - 1] || 1 }));
      return;
    }

    if (lockedBattingTeam && String(form.battingTeam) !== getTeamId(lockedBattingTeam)) {
      setForm((current) => ({ ...current, battingTeam: getTeamId(lockedBattingTeam) }));
      return;
    }

    const teamIds = teams.map((team) => getTeamId(team));
    if (teams.length > 0 && !teamIds.includes(String(form.battingTeam))) {
      setForm((current) => ({ ...current, battingTeam: getTeamId(teams[0]) }));
    }
  }, [availableInnings, form.battingTeam, form.innings, lockedBattingTeam, teams]);

  useEffect(() => {
    const currentStriker = getTeamId(selectedScore?.currentStriker);
    const currentNonStriker = getTeamId(selectedScore?.currentNonStriker);
    const currentBowler = getTeamId(selectedScore?.currentBowler);
    const next = {};

    if (!hasPlayer(availableBatters, form.striker)) {
      next.striker = hasPlayer(availableBatters, currentStriker) ? currentStriker : availableBatters[0]?._id || '';
    }

    const effectiveStriker = next.striker || form.striker;
    if (!hasPlayer(availableBatters, form.nonStriker) || form.nonStriker === effectiveStriker) {
      const fallbackNonStriker = hasPlayer(availableBatters, currentNonStriker) && currentNonStriker !== effectiveStriker
        ? currentNonStriker
        : availableBatters.find((player) => String(player._id) !== String(effectiveStriker))?._id || '';
      next.nonStriker = fallbackNonStriker;
    }

    if (!hasPlayer(bowlingPlayers, form.bowler)) {
      next.bowler = hasPlayer(bowlingPlayers, currentBowler) ? currentBowler : bowlingPlayers[0]?._id || '';
    }

    const effectiveNonStriker = next.nonStriker || form.nonStriker;
    if (form.dismissedPlayer && ![effectiveStriker, effectiveNonStriker].includes(form.dismissedPlayer)) {
      next.dismissedPlayer = '';
    }

    if (form.newBatter && (!hasPlayer(availableBatters, form.newBatter) || [effectiveStriker, effectiveNonStriker].includes(form.newBatter))) {
      next.newBatter = '';
    }

    if (form.newBatter && !hasPlayer(newBatterOptions, form.newBatter)) {
      next.newBatter = '';
    }

    if (Object.keys(next).length > 0) {
      setForm((current) => ({ ...current, ...next }));
    }
  }, [
    availableBatters, bowlingPlayers, form.bowler, form.dismissedPlayer, form.newBatter,
    form.nonStriker, form.striker, newBatterOptions, selectedScore?.currentBowler,
    selectedScore?.currentNonStriker, selectedScore?.currentStriker,
  ]);

  useEffect(() => {
    if (!activeMatchId) return undefined;
    const socket = getSocket();
    socket.connect();
    socket.emit('match:join', activeMatchId);

    const refresh = () => {
      refetchScoreboard();
      refetchMatches();
    };

    socket.on('score.updated', refresh);
    socket.on('match.status.updated', refresh);

    return () => {
      socket.emit('match:leave', activeMatchId);
      socket.off('score.updated', refresh);
      socket.off('match.status.updated', refresh);
    };
  }, [activeMatchId, refetchMatches, refetchScoreboard]);

  function setField(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  function swapBatters() {
    setForm((current) => ({
      ...current,
      striker: current.nonStriker,
      nonStriker: current.striker,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!activeMatchId || !form.battingTeam) return;

    const body = {
      innings: Number(form.innings),
      battingTeam: form.battingTeam,
      striker: form.striker,
      nonStriker: form.nonStriker,
      bowler: form.bowler,
      runs: Number(form.runs),
      extras: Number(form.extras || 0),
      extraType: form.extraType,
      isWicket: Boolean(form.isWicket),
      note: form.note,
      ...(form.isWicket ? {
        wicketType: form.wicketType,
        dismissedPlayer: form.dismissedPlayer || form.striker,
        newBatter: form.newBatter,
      } : {}),
    };

    try {
      const result = await addScoreBall({ matchId: activeMatchId, body }).unwrap();
      const nextScore = result?.score;
      const dismissedId = getPlayerId(result?.event?.dismissedPlayer || body.dismissedPlayer);

      if (dismissedId) {
        setLocalDismissedByInnings((current) => {
          const inningsKey = Number(body.innings);
          const existing = current[inningsKey] || [];
          return { ...current, [inningsKey]: Array.from(new Set([...existing, dismissedId])) };
        });
      }

      setForm((current) => ({
        ...current,
        striker: getTeamId(nextScore?.currentStriker) || current.striker,
        nonStriker: getTeamId(nextScore?.currentNonStriker) || current.nonStriker,
        bowler: getTeamId(nextScore?.currentBowler) || current.bowler,
        runs: 0,
        extras: 0,
        extraType: 'NONE',
        isWicket: false,
        dismissedPlayer: '',
        newBatter: '',
        wicketType: 'OTHER',
        note: '',
      }));
    } catch (error) {
      toast.error(error?.data?.message || 'Unable to update score');
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-120px)] text-[#d3d7de]">

      {/* LEFT COLUMN: Live Matches */}
      <aside className="w-full lg:w-[280px] flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          <h2 className="text-xl font-bold text-white tracking-tight">Live Matches</h2>
        </div>

        {isMatchesLoading ? (
          <LoadingState label="Loading matches" variant="panel" className="min-h-36" />
        ) : liveMatches.length === 0 ? (
          <div className="text-sm text-[#87909e]">No live matches.</div>
        ) : (
          liveMatches.map((match) => {
            const isSelected = String(match._id) === String(activeMatchId);
            const team1Name = getTeamName(match.team1);
            const team2Name = getTeamName(match.team2);
            const s1 = isSelected ? getScoreByInnings(scoreboard?.scores || [], 1) : null;
            const s2 = isSelected ? getScoreByInnings(scoreboard?.scores || [], 2) : null;

            return (
              <button
                type="button"
                key={match._id}
                onClick={() => setActiveMatchId(match._id)}
                className={`flex flex-col text-left rounded-xl border p-4 transition ${isSelected ? 'bg-[#212428] border-[#3c3e42]' : 'bg-[#1a1c1e] border-[#26282b] hover:border-[#3c3e42]'}`}
              >
                <div className="flex items-center justify-between mb-3 w-full">
                  <span className="flex items-center gap-1.5 rounded-full bg-[#1c2e4a] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#6d9eeb]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6d9eeb] animate-pulse"></span>
                    LIVE
                  </span>
                  <span className="text-[10px] font-bold text-[#87909e] uppercase tracking-widest">{match.matchType || 'T20'}</span>
                </div>

                {isSelected ? (
                  <>
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-white">{team1Name}</span>
                      <span className="font-bold text-[#6d9eeb]">{s1 ? `${s1.runs}/${s1.wickets} (${s1.overs})` : 'Yet to Bat'}</span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-semibold text-[#87909e]">{team2Name}</span>
                      <span className="text-sm font-semibold text-[#87909e]">{s2 ? `${s2.runs}/${s2.wickets} (${s2.overs})` : 'Yet to Bat'}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-[#d3d7de]">{team1Name}</span>
                      <span className="text-xs font-bold text-[#87909e]">{match.scores?.[0] ? `${match.scores[0].runs}/${match.scores[0].wickets} (${match.scores[0].overs})` : ''}</span>
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-[#d3d7de]">{team2Name}</span>
                      <span className="text-xs font-bold text-[#87909e]">{match.scores?.[1] ? `${match.scores[1].runs}/${match.scores[1].wickets} (${match.scores[1].overs})` : ''}</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })
        )}
      </aside>

      {/* MIDDLE COLUMN: Main Console */}
      <section className="flex-1 flex flex-col gap-6">
        {!activeMatchId ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-[#26282b] bg-[#1a1c1e] p-8 text-[#87909e]">
            Select a match to start scoring
          </div>
        ) : isScoreLoading ? (
          <LoadingState label="Loading scoring console" size="lg" variant="panel" className="min-h-[420px]" />
        ) : (
          <>
            {/* Active State Header */}
            <div className="flex items-center justify-between rounded-xl border border-[#26282b] bg-[#1e2023] p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e] mb-1.5">ACTIVE STATE</p>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedInnings}
                    onChange={(e) => setForm(f => ({ ...f, innings: Number(e.target.value) }))}
                    className="rounded bg-[#2a2c30] border border-[#3c3e42] px-3 py-1.5 text-sm font-bold text-white cursor-pointer hover:bg-[#3c3e42] transition"
                  >
                    {Array.from({ length: scoringRules.maxInnings || 2 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>
                        {num === 1 ? '1st' : num === 2 ? '2nd' : `${num}th`} Innings
                      </option>
                    ))}
                  </select>
                  {lockedBattingTeam && (
                    <span className="text-sm font-bold text-[#a0a5ad] ml-1">
                      {getTeamName(lockedBattingTeam)} Batting
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e] mb-1">OVER LIMIT</p>
                  <p className="text-sm font-bold text-[#d7ff5f]">{scoringRules.maxOvers ? `${scoringRules.maxOvers}.0` : 'None'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e] mb-1">STATUS</p>
                  <p className="text-sm font-bold text-[#d7ff5f]">ACTIVE</p>
                </div>
              </div>
            </div>

            {/* Players Area */}
            <div className="grid gap-6 xl:grid-cols-2">

              {/* Batting Pair */}
              <div className="flex flex-col rounded-xl border border-[#26282b] bg-[#1e2023] overflow-hidden">
                <div className="border-b border-[#26282b] bg-[#1a1c1e] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e]">BATTING PAIR</p>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  {isBattingPairLocked ? (
                    <>
                      <div className="flex items-center gap-3 rounded-lg border border-[#3c3e42] bg-[#2a2c30] p-3">
                        <svg className="w-5 h-5 text-white transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        <div>
                          <p className="font-bold text-white text-sm">
                            {getPlayerName(strikerPlayer)} {strikerStat ? strikerStat.runs : 0}
                          </p>
                          <p className="text-xs text-[#87909e] mt-0.5">(Striker) {strikerStat ? `(${strikerStat.balls})*` : '(0)*'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-[#26282b] bg-[#1e2023] p-3">
                        <svg className="w-5 h-5 text-[#87909e]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <div>
                          <p className="font-bold text-[#d3d7de] text-sm">
                            {getPlayerName(nonStrikerPlayer)} {nonStrikerStat ? nonStrikerStat.runs : 0}
                          </p>
                          <p className="text-xs text-[#87909e] mt-0.5">Non-Striker {nonStrikerStat ? `(${nonStrikerStat.balls})` : '(0)'}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <select value={form.striker} onChange={(e) => setField('striker', e.target.value)} className="h-10 w-full rounded-md border border-[#3c3e42] bg-[#1a1c1e] px-3 text-sm text-white">
                        <option value="">Select Striker</option>
                        {availableBatters.filter((p) => getPlayerId(p) !== String(form.nonStriker)).map((p) => (
                          <option key={getPlayerId(p)} value={getPlayerId(p)}>{getPlayerName(p)}</option>
                        ))}
                      </select>
                      <select value={form.nonStriker} onChange={(e) => setField('nonStriker', e.target.value)} className="h-10 w-full rounded-md border border-[#3c3e42] bg-[#1a1c1e] px-3 text-sm text-white">
                        <option value="">Select Non-Striker</option>
                        {availableBatters.filter((p) => getPlayerId(p) !== String(form.striker)).map((p) => (
                          <option key={getPlayerId(p)} value={getPlayerId(p)}>{getPlayerName(p)}</option>
                        ))}
                      </select>
                    </>
                  )}

                  <div className="mt-auto pt-2">
                    <button
                      type="button"
                      onClick={swapBatters}
                      disabled={!form.striker || !form.nonStriker}
                      className="w-full h-9 rounded-md bg-[#2a2c30] text-xs font-bold text-white transition hover:bg-[#3c3e42] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                      Swap Batters
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Bowler */}
              <div className="flex flex-col rounded-xl border border-[#eab308]/40 bg-[#1e2023] overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#eab308]"></div>
                <div className="border-b border-[#26282b] bg-[#1a1c1e] px-4 py-3 pl-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e]">CURRENT BOWLER</p>
                </div>
                <div className="p-4 pl-5 space-y-4 flex-1 flex flex-col">
                  {bowlerStat && form.bowler ? (
                    <div className="flex items-center gap-3 rounded-lg border border-[#3c3e42] bg-[#2a2c30] p-4">
                      <div className="w-8 h-8 rounded-full bg-[#eab308]/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-[#eab308]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 01-1 1H7a1 1 0 010-2h1a1 1 0 011 1zm7 0a1 1 0 01-1 1h-1a1 1 0 010-2h1a1 1 0 011 1zm-4 4a1 1 0 01-1 1h-1a1 1 0 010-2h1a1 1 0 011 1z" /></svg>
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">
                          {getPlayerName(bowlerPlayer)} <span className="ml-2 font-black">{bowlerStat.overs}-{bowlerStat.runsConceded}-{bowlerStat.wickets}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[#87909e] italic py-2">No active bowler</div>
                  )}

                  <select value={form.bowler} onChange={(e) => setField('bowler', e.target.value)} className="h-10 w-full rounded-md border border-[#3c3e42] bg-[#1a1c1e] px-3 text-sm text-white mt-auto">
                    <option value="">Select Bowler</option>
                    {bowlingPlayers.map((p) => (
                      <option key={p._id} value={p._id}>{getPlayerName(p)}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Ball Entry Console */}
            <form onSubmit={handleSubmit} className="flex flex-col rounded-xl border border-[#26282b] bg-[#1e2023] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#26282b] bg-[#1a1c1e] px-4 py-3">
                <p className="text-sm font-bold text-white">Ball Entry Console</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isWicket}
                    onChange={(event) => setField('isWicket', event.target.checked)}
                    className="h-4 w-4 rounded border-[#3c3e42] bg-[#1a1c1e] text-[#f43f5e] focus:ring-[#f43f5e] focus:ring-offset-[#1e2023]"
                  />
                  <span className="text-[11px] font-black tracking-widest uppercase text-[#f43f5e]">WICKET</span>
                </label>
              </div>

              <div className="p-5">
                {/* Runs */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {RUN_OPTIONS.map((run) => (
                    <button
                      type="button"
                      key={run}
                      onClick={() => setField('runs', run)}
                      disabled={!canAddBall}
                      className={`h-14 rounded-lg text-xl font-black transition ${Number(form.runs) === run
                          ? 'bg-[#3c3e42] text-white border border-[#87909e]'
                          : 'bg-[#2a2c30] text-[#a0a5ad] border border-transparent hover:bg-[#3c3e42] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                    >
                      {run}
                    </button>
                  ))}
                </div>

                {/* Optional Wicket Details */}
                {form.isWicket && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 bg-[#f43f5e]/10 border border-[#f43f5e]/20 p-3 rounded-lg">
                    <select value={form.wicketType} onChange={(e) => setField('wicketType', e.target.value)} className="h-10 rounded-md border border-[#f43f5e]/30 bg-[#1e2023] px-3 text-xs text-[#f43f5e] font-bold outline-none">
                      {WICKET_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                    <select value={form.dismissedPlayer || form.striker} onChange={(e) => setField('dismissedPlayer', e.target.value)} className="h-10 rounded-md border border-[#f43f5e]/30 bg-[#1e2023] px-3 text-xs text-white outline-none">
                      {[form.striker, form.nonStriker].filter(Boolean).map((id) => {
                        const p = battingPlayers.find((item) => getPlayerId(item) === String(id));
                        return <option key={id} value={id}>{getPlayerName(p)}</option>;
                      })}
                    </select>
                    <select value={form.newBatter} onChange={(e) => setField('newBatter', e.target.value)} className="h-10 rounded-md border border-[#f43f5e]/30 bg-[#1e2023] px-3 text-xs text-white outline-none">
                      <option value="">Incoming Batter...</option>
                      {newBatterOptions.map((p) => <option key={getPlayerId(p)} value={getPlayerId(p)}>{getPlayerName(p)}</option>)}
                    </select>
                  </div>
                )}

                {/* Extras & Notes */}
                <div className="mt-4 grid gap-4 grid-cols-[1fr_auto_80px]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e] mb-1.5">BALL NOTE</p>
                    <input
                      value={form.note}
                      onChange={(event) => setField('note', event.target.value)}
                      placeholder="e.g. Beauty of a yorker..."
                      className="h-10 w-full rounded-md border border-[#3c3e42] bg-[#2a2c30] px-3 text-sm text-white placeholder-[#87909e] outline-none focus:border-[#baff16]"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e] mb-1.5">EXTRAS TYPE</p>
                    <select
                      value={form.extraType}
                      onChange={(event) => setField('extraType', event.target.value)}
                      className="h-10 w-full rounded-md border border-[#3c3e42] bg-[#2a2c30] px-3 text-sm text-white outline-none focus:border-[#baff16]"
                    >
                      {EXTRA_TYPES.map((type) => (
                        <option key={type} value={type}>{type === 'NONE' ? 'None' : type.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e] mb-1.5">EXTRAS</p>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={form.extras}
                      onChange={(event) => setField('extras', event.target.value)}
                      className="h-10 w-full rounded-md border border-[#3c3e42] bg-[#2a2c30] px-3 text-sm text-white text-center outline-none focus:border-[#baff16]"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={addState.isLoading || !canAddBall}
                    className="w-full h-12 rounded-lg bg-[#baff16] text-[#080b0a] font-bold flex items-center justify-center gap-2 transition hover:bg-[#d7ff5f] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addState.isLoading ? (
                      <LoadingLabel label="COMMITTING" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        COMMIT BALL
                      </>
                    )}
                  </button>
                  {!canAddBall && !isSelectedInningsComplete && (
                    <p className="text-center text-xs text-[#f43f5e] mt-2">Please ensure all player selections are completed.</p>
                  )}
                  {isSelectedInningsComplete && (
                    <p className="text-center text-xs text-[#eab308] mt-2">Innings {selectedInnings} is complete. Change innings to continue.</p>
                  )}
                </div>
              </div>
            </form>

            {/* Hidden Controls (Still needed for logic to work properly but not prominent in UI) */}
            <div className="hidden">
              <select value={form.innings} onChange={(e) => setField('innings', Number(e.target.value))}>
                {Array.from({ length: scoringRules.maxInnings }, (_, index) => index + 1).map((innings) => (
                  <option key={innings} value={innings}>Innings {innings}</option>
                ))}
              </select>
              <select value={form.battingTeam} onChange={(e) => setField('battingTeam', e.target.value)}>
                {teams.map((t) => <option key={getTeamId(t)} value={getTeamId(t)}>{t.name}</option>)}
              </select>
            </div>
          </>
        )}
      </section>

      {/* RIGHT COLUMN: Match Log */}
      <aside className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-5">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <h2 className="text-xl font-bold text-white tracking-tight">Match Log</h2>
        </div>

        {activeMatchId && (
          <>
            {/* This Over */}
            <div className="rounded-xl border border-[#26282b] bg-[#1e2023] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e] mb-3">
                THIS OVER ({selectedScore ? selectedScore.overs : '0.0'})
              </p>
              <div className="flex flex-wrap gap-2">
                {thisOverEvents.length === 0 ? (
                  <span className="text-xs text-[#87909e] italic">No balls yet in this over</span>
                ) : (
                  thisOverEvents.map((e) => {
                    const isBoundary = e.totalRuns === 4 || e.totalRuns === 6;
                    return (
                      <div
                        key={e._id}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${e.isWicket ? 'bg-[#f43f5e] text-white' :
                            isBoundary ? 'bg-[#baff16] text-[#080b0a]' :
                              'bg-[#2a2c30] text-[#d3d7de]'
                          }`}
                      >
                        {e.isWicket ? 'W' : e.totalRuns}
                      </div>
                    );
                  })
                )}
                <div className="w-8 h-8 rounded-full border border-[#3c3e42] flex items-center justify-center text-[#87909e] text-xs font-black">...</div>
              </div>
            </div>

            {/* Current Batsmen Table */}
            <div className="rounded-xl border border-[#26282b] bg-[#1e2023] overflow-hidden">
              <div className="px-4 py-3 bg-[#1a1c1e] border-b border-[#26282b]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e]">CURRENT BATSMEN</p>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1e2023] text-[#87909e]">
                  <tr>
                    <th className="px-4 py-2 font-bold uppercase">Batter</th>
                    <th className="px-3 py-2 font-bold uppercase">R</th>
                    <th className="px-3 py-2 font-bold uppercase text-right">SR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26282b]">
                  {[strikerStat, nonStrikerStat].filter(Boolean).map((stat) => {
                    const sr = stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0';
                    const isStriker = String(stat.player._id || stat.player) === String(form.striker);
                    return (
                      <tr key={getPlayerId(stat.player)}>
                        <td className={`px-4 py-2.5 font-bold ${isStriker ? 'text-[#d7ff5f]' : 'text-white'}`}>
                          {getPlayerName(stat.player)}{isStriker ? '*' : ''}
                        </td>
                        <td className="px-3 py-2.5 text-white font-medium">{stat.runs}</td>
                        <td className="px-3 py-2.5 text-white font-medium text-right">{sr}</td>
                      </tr>
                    );
                  })}
                  {(!strikerStat && !nonStrikerStat) && (
                    <tr><td colSpan="3" className="px-4 py-4 text-center text-[#87909e]">No batsmen selected</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Ball-by-ball */}
            <div className="rounded-xl border border-[#26282b] bg-[#1e2023] overflow-hidden flex-1 flex flex-col min-h-[300px]">
              <div className="px-4 py-3 bg-[#1a1c1e] border-b border-[#26282b] flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#87909e]">BALL-BY-BALL</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {recentEvents.length === 0 ? (
                  <p className="text-xs text-[#87909e] text-center mt-4">No events recorded yet.</p>
                ) : (
                  recentEvents.map((e) => {
                    const isBoundary = e.totalRuns === 4 || e.totalRuns === 6;
                    return (
                      <div key={e._id} className="flex gap-3">
                        <div className="text-xs font-medium text-[#87909e] pt-1 shrink-0 w-8">{e.over}.{e.ball}</div>
                        <div className="shrink-0 pt-0.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${e.isWicket ? 'bg-[#f43f5e] text-white' :
                              isBoundary ? 'bg-[#baff16] text-[#080b0a]' :
                                'bg-[#2a2c30] text-[#d3d7de]'
                            }`}>
                            {e.isWicket ? 'W' : e.totalRuns}
                          </div>
                        </div>
                        <div className="flex-1 text-xs">
                          <p className="font-bold text-white mb-0.5">
                            {e.bowler?.name || 'Bowler'} to {e.striker?.name || 'Batter'}
                            {isBoundary ? `, ${e.totalRuns}!` : e.isWicket ? ', OUT!' : ''}
                          </p>
                          {(e.note || e.extraType !== 'NONE') && (
                            <p className="text-[#87909e] leading-snug">
                              {e.note}
                              {e.note && e.extraType !== 'NONE' ? ' ' : ''}
                              {e.extraType !== 'NONE' ? `(${e.extraType.replace('_', ' ')})` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </aside>

    </div>
  );
}

export default ScoringPage;
