import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router';
import LoadingState from '../../../shared/components/LoadingState.jsx';
import { getSocket } from '../../../shared/socket/socketClient.js';
import { homeApi, useGetHomeStatusQuery } from '../api/homeApi.js';

function getTeamName(team) {
  return team?.shortName || team?.name || 'Team';
}

function getTeamScore(match, teamId) {
  const score = match.scores?.find(s => s.battingTeam?._id === teamId || s.battingTeam === teamId);
  if (score) {
    return `${score.runs}/${score.wickets}`;
  }
  return '-';
}

function getEntityId(value) {
  return String(value?._id || value?.id || value || '');
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

function MatchCard({ match, tone = 'live' }) {
  const statusLabel = tone === 'result' ? 'RESULT' : match.status.replaceAll('_', ' ');

  return (
    <Link
      to={`/matches/${match._id}`}
      className="group flex flex-col rounded-2xl border border-[#263020] bg-[#121713] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#baff16]/70 hover:bg-[#171d18]"
    >
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#a0a5ad] mb-6">
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${tone === 'live' ? 'bg-[#e51d20] text-white' : 'bg-[#2a2c30] text-[#d3d7de]'}`}>
          {tone === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>}
          {statusLabel}
        </span>
        <span className="truncate ml-2 text-[#d3d7de]">{match.series?.matchType || match.matchType || 'Match'}, {match.venue?.split(',')[0] || 'Venue'}</span>
      </div>

      <div className="space-y-5 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 overflow-hidden rounded-full border border-[#334033] bg-[#222a21]">
              {match.team1?.logo ? <img src={match.team1.logo} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[#334033]" />}
            </div>
            <span className="text-lg font-black text-white">{getTeamName(match.team1)}</span>
          </div>
          {tone === 'upcoming' ? (
             <span className="text-2xl font-black italic text-[#a0a5ad] opacity-40">VS</span>
          ) : (
             <span className="text-2xl font-black text-white">{getTeamScore(match, match.team1?._id)}</span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 overflow-hidden rounded-full border border-[#334033] bg-[#222a21]">
              {match.team2?.logo ? <img src={match.team2.logo} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-[#334033]" />}
            </div>
            <span className={`text-lg font-black ${tone === 'live' ? 'text-[#87909e]' : 'text-white'}`}>{getTeamName(match.team2)}</span>
          </div>
          {tone === 'upcoming' ? (
             <span className="text-[11px] font-bold text-[#87909e]">Starts {new Date(match.scheduledAt).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false})}</span>
          ) : (
             <span className={`text-2xl font-black ${tone === 'live' ? 'text-[#87909e]' : 'text-white'}`}>{getTeamScore(match, match.team2?._id)}</span>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-[#263020] pt-4">
        {tone === 'upcoming' && (
          <>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#a0a5ad]">
              MATCH DAY: {new Date(match.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span className="text-[11px] font-black text-white hover:underline">Set Reminder</span>
          </>
        )}
        {tone === 'live' && (
          <>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#a0a5ad]">
              {match.tossWinner ? `${getTeamName(match.tossWinner)} OPT TO ${match.tossDecision || 'BAT'}` : 'TOSS PENDING'}
            </span>
            <span className="text-[11px] font-black text-[#d3d7de]">{match.liveScore?.overs || '0.0'} Overs</span>
          </>
        )}
        {tone === 'result' && (
          <>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#a0a5ad] truncate max-w-[80%]">{match.result || 'Match Ended'}</span>
            <svg className="h-5 w-5 text-[#87909e] flex-shrink-0 hover:text-white transition cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </>
        )}
      </div>
    </Link>
  );
}


function HomePage() {
  const dispatch = useDispatch();
  const { data, isLoading, refetch } = useGetHomeStatusQuery();
  const liveMatches = data?.liveMatches || [];
  const upcomingMatches = data?.upcomingMatches || [];
  const recentMatches = data?.recentMatches || [];

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const refreshHome = (payload = {}) => {
      if (payload.reason === 'score.updated' && payload.score && payload.matchId) {
        dispatch(homeApi.util.updateQueryData('getHomeStatus', undefined, (draft) => {
          const updateMatch = (match) => {
            if (String(match._id) !== String(payload.matchId)) return match;
            const scores = upsertByIdOrInnings(match.scores || [], payload.score);
            return {
              ...match,
              scores,
              liveScore: payload.score,
            };
          };

          draft.liveMatches = (draft.liveMatches || []).map(updateMatch);
          draft.upcomingMatches = (draft.upcomingMatches || []).map(updateMatch);
          draft.recentMatches = (draft.recentMatches || []).map(updateMatch);
        }));
      }

      refetch();
    };

    socket.on('public.feed.updated', refreshHome);

    return () => {
      socket.off('public.feed.updated', refreshHome);
    };
  }, [dispatch, refetch]);

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(186,255,22,0.08),transparent_34%),#080b0a] text-white">
      <div className="mx-auto max-w-[1400px] px-8 py-10">
        
        {/* Header Hero */}
        <div className="mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#baff16] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#080b0a] shadow-[0_0_24px_rgba(186,255,22,0.18)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#080b0a]" />
            Live Cricket
          </span>
          <h1 className="mt-5 text-4xl font-black leading-none tracking-tight text-white sm:text-[2.75rem]">
            Scores, fixtures, and match updates
          </h1>
        </div>


        {/* Match Cards Grid */}
        <div className="grid gap-5 lg:grid-cols-3 xl:grid-cols-3">
          {isLoading ? (
            <LoadingState label="Loading matches" variant="panel" className="lg:col-span-3" />
          ) : (
            <>
              {liveMatches.map((match) => <MatchCard key={match._id} match={match} tone="live" />)}
              {upcomingMatches.map((match) => <MatchCard key={match._id} match={match} tone="upcoming" />)}
              {recentMatches.map((match) => <MatchCard key={match._id} match={match} tone="result" />)}
            </>
          )}
        </div>



      </div>
    </section>
  );
}

export default HomePage;
