import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router';

import LoadingState from '../../../shared/components/LoadingState.jsx';
import { getSocket } from '../../../shared/socket/socketClient.js';
import { homeApi, useGetPublicMatchCenterQuery, useGetPublicMatchCommentaryQuery } from '../api/homeApi.js';

function getTeamName(team) {
  return team?.shortName || team?.name || 'Team';
}

function getPlayerId(player) {
  return String(player?._id || player?.id || player || '');
}

function getEntityId(value) {
  return String(value?._id || value?.id || value || '');
}

function getFullTeamName(team) {
  return team?.name || team?.shortName || 'Team';
}

function getInitials(value = 'TM') {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDateTime(value) {
  if (!value) return 'Schedule pending';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

function isLiveStatus(status) {
  return ['LIVE', 'INNINGS_BREAK'].includes(status);
}

function isUpcomingStatus(status) {
  return ['UPCOMING', 'TOSS_COMPLETED', 'PLAYING_XI_SELECTED'].includes(status);
}

function isResultStatus(status) {
  return ['RESULT', 'COMPLETED', 'ABANDONED'].includes(status);
}

function formatInningsLabel(innings) {
  const value = Number(innings || 1);
  if (value === 1) return '1st Innings';
  if (value === 2) return '2nd Innings';
  if (value === 3) return '3rd Innings';
  return `${value}th Innings`;
}

function formatBalls(balls = 0) {
  return `${Math.floor(Number(balls || 0) / 6)}.${Number(balls || 0) % 6}`;
}

function upsertByIdOrInnings(items = [], item) {
  if (!item) return items;
  const itemId = getEntityId(item);
  const index = items.findIndex((entry) => (
    (itemId && getEntityId(entry) === itemId)
    || Number(entry?.innings) === Number(item.innings)
  ));

  if (index === -1) return [...items, item].sort((a, b) => Number(a.innings) - Number(b.innings));

  return items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...item } : entry));
}

function patchStatsWithEvent(stats = [], event = {}) {
  const innings = Number(event.innings);
  const strikerId = getPlayerId(event.striker);
  const dismissedId = getPlayerId(event.dismissedPlayer);
  const bowlerId = getPlayerId(event.bowler);
  const batterRuns = Number(event.batterRuns ?? event.runs ?? 0);

  return stats.map((entry) => {
    if (Number(entry.innings) !== innings) return entry;

    return {
      ...entry,
      batting: (entry.batting || []).map((row) => {
        const rowPlayerId = getPlayerId(row.player);
        const next = { ...row };

        if (rowPlayerId === strikerId) {
          next.runs = Number(next.runs || 0) + batterRuns;
          next.balls = Number(next.balls || 0) + (event.isLegalBall ? 1 : 0);
          next.fours = Number(next.fours || 0) + (batterRuns === 4 ? 1 : 0);
          next.sixes = Number(next.sixes || 0) + (batterRuns === 6 ? 1 : 0);
        }

        if (dismissedId && rowPlayerId === dismissedId) {
          next.isOut = true;
        }

        return next;
      }),
      bowling: (entry.bowling || []).map((row) => {
        if (getPlayerId(row.player) !== bowlerId) return row;

        const nextBalls = Number(row.balls || 0) + (event.isLegalBall ? 1 : 0);
        return {
          ...row,
          balls: nextBalls,
          overs: formatBalls(nextBalls),
          runsConceded: Number(row.runsConceded || 0) + Number(event.totalRuns || 0),
          wickets: Number(row.wickets || 0) + (event.isWicket && !['RUN_OUT', 'RETIRED_HURT'].includes(event.wicketType) ? 1 : 0),
        };
      }),
    };
  });
}

function TeamBadge({ team, align = 'center' }) {
  return (
    <div className={`flex flex-col items-${align} gap-3`}>
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#31393d] bg-[#2a2c30]">
        {team?.logo ? (
          <img src={team.logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xl font-black text-[#d7ff5f]">{getInitials(getTeamName(team))}</span>
        )}
      </div>
      <div className={`text-${align}`}>
        <p className="text-lg font-black tracking-tight text-white">{getFullTeamName(team)}</p>
      </div>
    </div>
  );
}

function MatchHero({ match, liveScore }) {
  const live = isLiveStatus(match.status);
  const statusLabel = live ? `LIVE - ${formatInningsLabel(liveScore?.innings)}` : match.status.replaceAll('_', ' ');

  return (
    <section className="rounded-2xl border border-[#26282b] bg-[#1a1c1e] p-6 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-10">
        
        {/* Team 1 */}
        <TeamBadge team={match.team1} align="center" />

        {/* Score */}
        <div className="flex flex-col items-center text-center">
           <span className="rounded-full border border-[#6d7f38] bg-[#253013] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#d7ff5f] mb-4">
             {statusLabel}
           </span>
           <h1 className="text-[2.75rem] font-black leading-none tracking-tight text-white drop-shadow-md">
             {live ? `${getTeamName(liveScore?.battingTeam)} ${liveScore?.runs || 0}/${liveScore?.wickets || 0}` : 'VS'}
           </h1>
           <p className="mt-3 text-[11px] font-bold tracking-[0.15em] text-[#a0a5ad] uppercase">
             {liveScore?.overs || '0.0'} OVERS (RR {liveScore?.runRate || '0.00'})
           </p>
        </div>

        {/* Team 2 */}
        <TeamBadge team={match.team2} align="center" />

      </div>

      {/* Footer */}
      <div className="mt-10 flex border-t border-[#26282b] pt-6 justify-center gap-12 sm:gap-24 text-center">
         <div>
           <p className="text-[10px] font-black uppercase tracking-widest text-[#87909e]">VENUE</p>
           <p className="mt-1 text-sm font-semibold text-[#d3d7de]">{match.venue || 'Narendra Modi Stadium, Ahmedabad'}</p>
         </div>
         <div className="h-10 w-px bg-[#26282b]" />
         <div>
           <p className="text-[10px] font-black uppercase tracking-widest text-[#87909e]">TARGET</p>
           <p className="mt-1 text-sm font-semibold text-[#d3d7de]">Proj. 215</p>
         </div>
      </div>
    </section>
  );
}

function MatchPulse({ recentEvents = [], liveScore }) {
  const recentOverRuns = recentEvents.slice(0, 6).reduce((total, event) => total + Number(event?.totalRuns || 0), 0);

  return (
    <section className="rounded-2xl border border-[#26282b] bg-[#1a1c1e] p-6 shadow-sm">
      <h2 className="text-[1.3rem] font-black text-white">Match Pulse</h2>
      <div className="mt-6 border-b border-[#26282b] pb-6">
        <div className="flex justify-between text-[11px] font-black uppercase tracking-[0.15em] text-[#d3d7de]">
          <span>{getTeamName(liveScore?.battingTeam)} <span className="text-[#a0a5ad] ml-1">{liveScore?.runs || 0}/{liveScore?.wickets || 0}</span></span>
          <span>{liveScore?.overs || '0.0'} OV</span>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full">
          <div className="h-full bg-[#baff16]" style={{ width: `${Math.min(Number(liveScore?.runRate || 0) * 8, 100)}%` }} />
          <div className="h-full flex-1 bg-[#31393d]" />
        </div>
      </div>
      <div className="mt-6">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#87909e]">Recent Over</p>
        <div className="mt-4 flex gap-2 overflow-x-auto items-center">
          {recentEvents.length === 0 ? (
            <p className="text-sm text-[#9ba3ad]">No balls yet.</p>
          ) : (
            recentEvents.slice(0, 6).map((event) => (
              <span key={event._id} className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg text-[13px] font-black shadow-sm ${
                event?.isWicket
                  ? 'bg-[#e5b2b2] text-[#4b1b1b]'
                  : Number(event?.totalRuns) >= 4
                    ? 'bg-[#d7ff5f] text-[#080b0a]'
                    : 'bg-[#31393d] text-[#e0e3e8]'
              }`}>
                {event?.isWicket ? 'W' : event?.totalRuns}
              </span>
            ))
          )}
          {/* Mock run total */}
          {recentEvents.length > 0 && (
            <div className="ml-auto flex flex-col items-center justify-center leading-tight">
               <span className="text-[10px] font-black text-[#a0a5ad]">{recentOverRuns}</span>
               <span className="text-[10px] font-bold text-[#a0a5ad]">Runs</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LiveBatting({ stats = [], liveScore }) {
  const currentInnings = Number(liveScore?.innings || stats.at(-1)?.innings || 1);
  const rows = stats.find((entry) => Number(entry.innings) === currentInnings)?.batting || [];
  const strikerId = getPlayerId(liveScore?.currentStriker);
  const nonStrikerId = getPlayerId(liveScore?.currentNonStriker);
  const activeIds = new Set([strikerId, nonStrikerId].filter(Boolean));
  const activeRows = [
    ...rows.filter((row) => activeIds.has(getPlayerId(row.player))),
    ...rows.filter((row) => !activeIds.has(getPlayerId(row.player)) && row.balls > 0 && !row.isOut),
  ].slice(0, 4);

  return (
    <section className="rounded-2xl border border-[#26282b] bg-[#1a1c1e] p-6 shadow-sm">
      <h2 className="text-[1.3rem] font-black text-white">Live Batting</h2>
      
      <div className="mt-6">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 text-[10px] font-black uppercase tracking-[0.15em] text-[#a0a5ad] mb-4 px-4">
          <span>Batter</span>
          <span className="w-6 text-center">R</span>
          <span className="w-6 text-center">B</span>
          <span className="w-6 text-center">4s</span>
          <span className="w-6 text-center">6s</span>
          <span className="w-10 text-right">SR</span>
        </div>

        <div className="space-y-4">
          {activeRows.length === 0 ? (
            <p className="text-sm text-[#87909e] px-4">Batting card will appear once scoring starts.</p>
          ) : (
            activeRows.map((row) => {
              const isStriker = getPlayerId(row.player) === strikerId;

              return (
              <div key={row.player?._id || row.player?.name} className={`relative grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 py-1.5 px-4`}>
                {/* Active marker for striker */}
                {isStriker && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#baff16] rounded-r-sm" />}
                
                <span className="font-black text-[#e0e3e8] truncate">{row.player?.name}{isStriker ? '*' : ''}</span>
                <span className={`w-6 text-center font-black ${isStriker ? 'text-[#d7ff5f]' : 'text-white'}`}>{row.runs}</span>
                <span className="w-6 text-center font-bold text-[#d3d7de]">{row.balls}</span>
                <span className="w-6 text-center font-bold text-[#d3d7de]">{row.fours}</span>
                <span className="w-6 text-center font-bold text-[#d3d7de]">{row.sixes}</span>
                <span className="w-10 text-right font-black text-[#d3d7de]">{((row.runs / (row.balls || 1)) * 100).toFixed(1)}</span>
              </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function CommentaryPanel({ commentary = [] }) {
  return (
    <section className="rounded-2xl border border-[#26282b] bg-[#1a1c1e] p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-[1.3rem] font-black text-white">Commentary</h2>
        <div className="flex gap-2">
           <span className="rounded bg-[#2a2c30] px-2 py-0.5 text-[9px] font-black tracking-widest text-[#a0a5ad]">WICKET</span>
           <span className="rounded bg-[#2a2c30] px-2 py-0.5 text-[9px] font-black tracking-widest text-[#a0a5ad]">SIX</span>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {commentary.length === 0 ? (
          <p className="text-sm text-[#87909e]">No commentary yet.</p>
        ) : (
          commentary.slice(0, 6).map((entry, i) => (
            <article key={entry._id} className={`relative rounded-xl border border-[#2a2c30] bg-[#1e2023] p-4 ${i===0 ? 'border-l-[3px] border-l-[#baff16]' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black tracking-widest text-[#d3d7de]">{entry.over}.{entry.ball}</span>
                <span className={`rounded px-2 py-0.5 text-[10px] font-black tracking-widest ${entry.type === 'SIX' ? 'bg-[#d7ff5f] text-[#080b0a]' : entry.type === 'WICKET' ? 'bg-[#e5b2b2] text-[#4b1b1b]' : 'bg-[#2a2c30] text-[#a0a5ad]'}`}>
                  {entry.type}
                </span>
              </div>
              <p className="mt-3 text-xs leading-[1.6] text-[#d3d7de]">{entry.text}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function Scorecards({ scores = [] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {scores.length === 0 ? (
        <div className="rounded-2xl border border-[#26282b] bg-[#1a1c1e] p-6 text-sm text-[#87909e]">
          Scorecard will appear after the first ball.
        </div>
      ) : (
        scores.map((score) => (
          <div key={score._id} className="rounded-2xl border border-[#26282b] bg-[#1a1c1e] p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#a0a5ad]">
              {getFullTeamName(score.battingTeam)} - Innings {score.innings}
            </p>
            <p className="mt-4 text-4xl font-black text-white">
              {score.runs}/{score.wickets}
              <span className="ml-2 text-sm font-bold text-[#a0a5ad]">({score.overs} ov)</span>
            </p>
          </div>
        ))
      )}
    </section>
  );
}

import VirtualArena3D from '../components/VirtualArena3D.jsx';

function VirtualArena({ latestEvent }) {
  return (
    <section className="rounded-2xl border border-[#26282b] bg-[#1a1c1e] shadow-sm overflow-hidden flex flex-col h-[500px]">
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-[#baff16]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/></svg>
          <div>
             <h2 className="text-[1.3rem] font-black text-white leading-none">Virtual Arena</h2>
             <p className="text-[11px] font-bold text-[#a0a5ad] mt-1.5">Real-time Ball Tracking & Field Placement</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2a2c30] transition hover:bg-[#3c3e42]">
             <svg className="h-4 w-4 text-[#d3d7de]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2a2c30] transition hover:bg-[#3c3e42]">
             <svg className="h-4 w-4 text-[#d3d7de]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <button className="rounded-lg bg-[#baff16] px-4 py-2 text-[10px] font-black tracking-widest text-[#080b0a] transition hover:bg-[#d7ff5f]">
            WAGON WHEEL
          </button>
        </div>
      </div>
      <div className="relative flex-1 bg-[#0c1517]">
        <VirtualArena3D latestEvent={latestEvent} />
      </div>
    </section>
  );
}

import UpcomingMatchView from '../components/UpcomingMatchView.jsx';
import ResultMatchView from '../components/ResultMatchView.jsx';

function PublicMatchPage() {
  const { matchId } = useParams();
  const dispatch = useDispatch();
  const commentaryQueryArgs = useMemo(() => ({ matchId, limit: 30 }), [matchId]);

  const {
    data,
    isLoading,
    refetch: refetchCenter,
  } = useGetPublicMatchCenterQuery(matchId, { skip: !matchId });
  const {
    data: commentaryResponse = { data: [] },
    refetch: refetchCommentary,
  } = useGetPublicMatchCommentaryQuery(commentaryQueryArgs, { skip: !matchId });

  const match = data?.matchInfo;
  const upcoming = isUpcomingStatus(match?.status);
  const result = isResultStatus(match?.status);

  useEffect(() => {
    if (!matchId) return undefined;

    const socket = getSocket();
    socket.connect();
    socket.emit('match:join', matchId);

    const refreshAll = () => {
      refetchCenter();
      refetchCommentary();
    };

    const refreshSoon = () => {
      window.setTimeout(refreshAll, 200);
    };

    const patchScore = (payload = {}) => {
      if (String(payload.matchId) !== String(matchId) || !payload.score) return;

      dispatch(homeApi.util.updateQueryData('getPublicMatchCenter', matchId, (draft) => {
        draft.liveScore = payload.score;
        draft.scores = upsertByIdOrInnings(draft.scores || [], payload.score);

        if (payload.event) {
          const eventId = getEntityId(payload.event);
          draft.recentEvents = [
            payload.event,
            ...(draft.recentEvents || []).filter((event) => getEntityId(event) !== eventId),
          ].slice(0, 24);
          draft.stats = patchStatsWithEvent(draft.stats || [], payload.event);
        }
      }));

      refreshSoon();
    };

    const refreshCurrentMatch = (payload = {}) => {
      if (!payload.matchId || String(payload.matchId) === String(matchId)) {
        if (payload.reason === 'score.updated') return;
        refreshAll();
      }
    };
    const patchCreatedCommentary = (payload = {}) => {
      if (String(payload.matchId) !== String(matchId) || !payload.commentary) {
        refetchCommentary();
        return;
      }

      dispatch(homeApi.util.updateQueryData('getPublicMatchCommentary', commentaryQueryArgs, (draft) => {
        const commentaryId = getEntityId(payload.commentary);
        const alreadyExists = (draft.data || []).some((entry) => getEntityId(entry) === commentaryId);
        draft.data = [
          payload.commentary,
          ...(draft.data || []).filter((entry) => getEntityId(entry) !== commentaryId),
        ].slice(0, commentaryQueryArgs.limit);
        if (draft.meta && !alreadyExists) {
          draft.meta.total = Number(draft.meta.total || 0) + 1;
        }
      }));
    };
    const patchDeletedCommentary = (payload = {}) => {
      if (String(payload.matchId) !== String(matchId) || !payload.commentaryId) {
        refetchCommentary();
        return;
      }

      dispatch(homeApi.util.updateQueryData('getPublicMatchCommentary', commentaryQueryArgs, (draft) => {
        const before = draft.data?.length || 0;
        draft.data = (draft.data || []).filter((entry) => getEntityId(entry) !== String(payload.commentaryId));
        if (draft.meta && before !== draft.data.length) {
          draft.meta.total = Math.max(Number(draft.meta.total || 0) - 1, 0);
        }
      }));
    };

    socket.on('score.updated', patchScore);
    socket.on('commentary.created', patchCreatedCommentary);
    socket.on('commentary.deleted', patchDeletedCommentary);
    socket.on('match.status.updated', refreshAll);
    socket.on('match.started', refreshAll);
    socket.on('match.completed', refreshAll);
    socket.on('toss.updated', refreshAll);
    socket.on('playingXI.updated', refreshAll);
    socket.on('public.feed.updated', refreshCurrentMatch);

    return () => {
      socket.emit('match:leave', matchId);
      socket.off('score.updated', patchScore);
      socket.off('commentary.created', patchCreatedCommentary);
      socket.off('commentary.deleted', patchDeletedCommentary);
      socket.off('match.status.updated', refreshAll);
      socket.off('match.started', refreshAll);
      socket.off('match.completed', refreshAll);
      socket.off('toss.updated', refreshAll);
      socket.off('playingXI.updated', refreshAll);
      socket.off('public.feed.updated', refreshCurrentMatch);
    };
  }, [commentaryQueryArgs, dispatch, matchId, refetchCenter, refetchCommentary]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080b0a] px-4 py-10">
        <LoadingState label="Loading match center" size="lg" variant="page" className="min-h-[70vh]" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Link to="/" className="text-sm font-bold text-[#d7ff5f]">Back to matches</Link>
        <p className="mt-6 text-2xl font-black text-white">Match not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(186,255,22,0.06),transparent_28%),#080b0a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link to="/" className="inline-flex text-sm font-black uppercase tracking-[0.18em] text-[#d7ff5f]">Back to matches</Link>

        {result ? (
          <ResultMatchView match={match} scores={data?.scores || []} fallOfWickets={data?.fallOfWickets || []} />
        ) : upcoming ? (
          <UpcomingMatchView match={match} />
        ) : (
          <>
            <MatchHero match={match} liveScore={data.liveScore} />

            <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
              <main className="space-y-6">
                <Scorecards scores={data.scores || []} />
                <VirtualArena latestEvent={data.recentEvents?.[0]} />
              </main>

              <aside className="space-y-6">
                <MatchPulse recentEvents={data.recentEvents || []} liveScore={data.liveScore} />
                <LiveBatting stats={data.stats || []} liveScore={data.liveScore} />
                <CommentaryPanel commentary={commentaryResponse.data || []} />
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PublicMatchPage;


