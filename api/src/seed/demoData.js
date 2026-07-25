import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';

import { connectDB, disconnectDB } from '../config/db.js';
import logger from '../config/logger.js';
import Commentary from '../modules/private/commentary/commentary.model.js';
import Player from '../modules/private/player/player.model.js';
import Score, { ScoreEvent } from '../modules/private/score/score.model.js';
import Series, { SeriesMatch } from '../modules/private/series/series.model.js';
import Team from '../modules/private/team/team.model.js';
import User from '../modules/private/users/user.model.js';
import { MatchStatus } from '../shared/constants/matchStatus.js';
import { Roles } from '../shared/constants/roles.js';

const TEAM_BLUEPRINTS = Object.freeze([
  { 
    code: 'IND', name: 'India', country: 'India', color: '#0f4c81', squadSize: 15,
    players: ['Rohit Sharma', 'Virat Kohli', 'Shubman Gill', 'Suryakumar Yadav', 'KL Rahul', 'Hardik Pandya', 'Ravindra Jadeja', 'Jasprit Bumrah', 'Mohammed Shami', 'Mohammed Siraj', 'Kuldeep Yadav', 'Rishabh Pant', 'Shreyas Iyer', 'Axar Patel', 'Arshdeep Singh']
  },
  { 
    code: 'AUS', name: 'Australia', country: 'Australia', color: '#ffcd00', squadSize: 15,
    players: ['Pat Cummins', 'David Warner', 'Travis Head', 'Steve Smith', 'Marnus Labuschagne', 'Glenn Maxwell', 'Mitchell Marsh', 'Cameron Green', 'Alex Carey', 'Mitchell Starc', 'Josh Hazlewood', 'Adam Zampa', 'Marcus Stoinis', 'Sean Abbott', 'Josh Inglis']
  },
  { 
    code: 'ENG', name: 'England', country: 'England', color: '#002654', squadSize: 15,
    players: ['Jos Buttler', 'Jonny Bairstow', 'Joe Root', 'Ben Stokes', 'Harry Brook', 'Liam Livingstone', 'Moeen Ali', 'Sam Curran', 'Chris Woakes', 'Adil Rashid', 'Mark Wood', 'Reece Topley', 'Dawid Malan', 'Jofra Archer', 'Phil Salt']
  },
  { 
    code: 'RSA', name: 'South Africa', country: 'South Africa', color: '#007749', squadSize: 15,
    players: ['Temba Bavuma', 'Quinton de Kock', 'Aiden Markram', 'Heinrich Klaasen', 'David Miller', 'Rassie van der Dussen', 'Marco Jansen', 'Kagiso Rabada', 'Anrich Nortje', 'Lungi Ngidi', 'Tabraiz Shamsi', 'Keshav Maharaj', 'Tristan Stubbs', 'Gerald Coetzee', 'Reeza Hendricks']
  },
  { 
    code: 'NZ', name: 'New Zealand', country: 'New Zealand', color: '#000000', squadSize: 15,
    players: ['Kane Williamson', 'Devon Conway', 'Rachin Ravindra', 'Daryl Mitchell', 'Tom Latham', 'Glenn Phillips', 'Mitchell Santner', 'Trent Boult', 'Tim Southee', 'Lockie Ferguson', 'Matt Henry', 'Ish Sodhi', 'Mark Chapman', 'Jimmy Neesham', 'Will Young']
  },
  { 
    code: 'PAK', name: 'Pakistan', country: 'Pakistan', color: '#01411c', squadSize: 15,
    players: ['Babar Azam', 'Mohammad Rizwan', 'Fakhar Zaman', 'Imam-ul-Haq', 'Iftikhar Ahmed', 'Shadab Khan', 'Mohammad Nawaz', 'Shaheen Afridi', 'Haris Rauf', 'Naseem Shah', 'Hasan Ali', 'Agha Salman', 'Usama Mir', 'Abdullah Shafique', 'Zaman Khan']
  },
  { 
    code: 'SL', name: 'Sri Lanka', country: 'Sri Lanka', color: '#002573', squadSize: 15,
    players: ['Dasun Shanaka', 'Kusal Mendis', 'Pathum Nissanka', 'Sadeera Samarawickrama', 'Charith Asalanka', 'Dhananjaya de Silva', 'Wanindu Hasaranga', 'Maheesh Theekshana', 'Matheesha Pathirana', 'Dilshan Madushanka', 'Dushmantha Chameera', 'Kasun Rajitha', 'Dimuth Karunaratne', 'Kusal Perera', 'Lahiru Kumara']
  },
  { 
    code: 'BAN', name: 'Bangladesh', country: 'Bangladesh', color: '#006a4e', squadSize: 15,
    players: ['Shakib Al Hasan', 'Litton Das', 'Najmul Hossain Shanto', 'Mushfiqur Rahim', 'Mahmudullah', 'Towhid Hridoy', 'Mehidy Hasan Miraz', 'Mustafizur Rahman', 'Taskin Ahmed', 'Shoriful Islam', 'Hasan Mahmud', 'Tanzim Hasan Sakib', 'Tanzid Hasan', 'Mahedi Hasan', 'Nasum Ahmed']
  },
  { 
    code: 'WI', name: 'West Indies', country: 'West Indies', color: '#7b0041', squadSize: 15,
    players: ['Rovman Powell', 'Shai Hope', 'Nicholas Pooran', 'Brandon King', 'Kyle Mayers', 'Shimron Hetmyer', 'Jason Holder', 'Andre Russell', 'Akeal Hosein', 'Alzarri Joseph', 'Romario Shepherd', 'Gudakesh Motie', 'Oshane Thomas', 'Johnson Charles', 'Keemo Paul']
  },
  { 
    code: 'AFG', name: 'Afghanistan', country: 'Afghanistan', color: '#0000ff', squadSize: 15,
    players: ['Hashmatullah Shahidi', 'Rahmanullah Gurbaz', 'Ibrahim Zadran', 'Rahmat Shah', 'Najibullah Zadran', 'Mohammad Nabi', 'Rashid Khan', 'Mujeeb Ur Rahman', 'Fazalhaq Farooqi', 'Naveen-ul-Haq', 'Azmatullah Omarzai', 'Noor Ahmad', 'Ikram Alikhil', 'Gulbadin Naib', 'Abdul Rahman']
  },
]);

const ROLE_PATTERN = Object.freeze([
  'BATSMAN',
  'BATSMAN',
  'WICKET_KEEPER',
  'ALL_ROUNDER',
  'ALL_ROUNDER',
  'BOWLER',
  'BOWLER',
  'BATSMAN',
  'ALL_ROUNDER',
  'BOWLER',
  'BOWLER',
  'BATSMAN',
  'ALL_ROUNDER',
  'BOWLER',
  'BATSMAN',
]);

const BOWLING_STYLES = Object.freeze([
  'RIGHT_ARM_FAST',
  'RIGHT_ARM_FAST_MEDIUM',
  'LEFT_ARM_FAST_MEDIUM',
  'RIGHT_ARM_OFF_BREAK',
  'RIGHT_ARM_LEG_BREAK',
  'LEFT_ARM_ORTHODOX',
]);

const VENUES = Object.freeze([
  'Demo Narendra Modi Stadium, Ahmedabad',
  'Demo Melbourne Cricket Ground, Melbourne',
  'Demo Lord\'s Cricket Ground, London',
  'Demo Wanderers Stadium, Johannesburg',
  'Demo Eden Park, Auckland',
  'Demo Gaddafi Stadium, Lahore',
  'Demo R Premadasa Stadium, Colombo',
  'Demo Sher-e-Bangla Stadium, Dhaka',
]);

const RUN_PATTERN = Object.freeze([0, 1, 2, 4, 1, 0, 6, 1, 3, 0, 2, 1, 4, 0, 1, 2, 1, 0]);
const DEMO_SERIES_NAMES = Object.freeze([
  'Demo Premier T20 2026',
  'Demo World ODI Cup 2026',
  'Demo Champions T20 2026',
]);

function daysFromNow(days, hour = 14, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function logoUrl(code, color = '#1a1f20') {
  return `https://placehold.co/256x256/${color.replace('#', '')}/ffffff?text=${code}`;
}

function formatOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function calculateRunRate(runs, balls) {
  if (!balls) return 0;
  return Number((runs / (balls / 6)).toFixed(2));
}

function getId(value) {
  return String(value?._id || value?.id || value || '');
}

function getOppositeTeam(match, teamId) {
  return getId(match.team1) === String(teamId) ? match.team2 : match.team1;
}

function getTossBattingTeam(match) {
  const tossWinnerId = getId(match.tossWinner);
  if (match.tossDecision === 'BAT') return getId(match.tossWinner);
  return getId(getOppositeTeam(match, tossWinnerId));
}

function getTeamById(teams, teamId) {
  return teams.find((team) => getId(team) === String(teamId));
}

function buildLineup(team) {
  const lineupPlayers = team.players.slice(0, 11);
  const wicketKeeper = lineupPlayers.find((player) => player.role === 'WICKET_KEEPER') || lineupPlayers[2];

  return lineupPlayers.map((player, index) => ({
    player: player._id,
    isCaptain: index === 0,
    isWicketKeeper: getId(player) === getId(wicketKeeper),
  }));
}

function getLineupPlayers(team) {
  return team.players.slice(0, 11);
}

function getBowlingOptions(team) {
  const options = getLineupPlayers(team).filter((player) => ['BOWLER', 'ALL_ROUNDER'].includes(player.role));
  return options.length ? options : getLineupPlayers(team).slice(-5);
}

function getWicketBalls(legalBalls, wicketCount, offset = 0) {
  if (!wicketCount) return new Set();
  const every = Math.max(8, Math.floor(legalBalls / (wicketCount + 1)));
  return new Set(
    Array.from({ length: wicketCount }, (_, index) => Math.min(legalBalls, every * (index + 1) + (offset % 4)))
  );
}

function commentaryType(event) {
  if (event.isWicket) return 'WICKET';
  if (event.runs === 6) return 'SIX';
  if (event.runs === 4) return 'FOUR';
  return 'NORMAL';
}

function ballText(event, striker, bowler) {
  if (event.isWicket) {
    return `${bowler.name} to ${striker.name}, wicket. ${striker.name} has to walk back.`;
  }

  if (event.runs === 6) return `${bowler.name} to ${striker.name}, six. Clean strike over the rope.`;
  if (event.runs === 4) return `${bowler.name} to ${striker.name}, four. Timed into the gap.`;
  if (event.runs === 0) return `${bowler.name} to ${striker.name}, no run. Tight line from the bowler.`;
  return `${bowler.name} to ${striker.name}, ${event.runs} run${event.runs === 1 ? '' : 's'}. Good running between the wickets.`;
}

function simulateInnings({ match, battingTeam, bowlingTeam, innings, legalBalls, target = null, wicketCount = 4, seed = 0, createdBy = null }) {
  const scoreId = new mongoose.Types.ObjectId();
  const batting = getLineupPlayers(battingTeam);
  const bowlers = getBowlingOptions(bowlingTeam);
  const wicketBalls = getWicketBalls(legalBalls, wicketCount, seed);
  const events = [];
  const commentary = [];
  let runs = 0;
  let wickets = 0;
  let balls = 0;
  let striker = batting[0];
  let nonStriker = batting[1];
  let nextBatterIndex = 2;
  let currentBowler = bowlers[0];

  for (let ballNumber = 1; ballNumber <= legalBalls; ballNumber += 1) {
    if (wickets >= 10) break;

    const over = Math.floor(balls / 6);
    const ball = (balls % 6) + 1;
    currentBowler = bowlers[over % bowlers.length];
    const isWicket = wicketBalls.has(ballNumber) && wickets < 9 && nextBatterIndex < batting.length;
    const batterRuns = isWicket ? 0 : RUN_PATTERN[(ballNumber + seed) % RUN_PATTERN.length];
    const eventTime = new Date(new Date(match.scheduledAt).getTime() + ballNumber * 60 * 1000);
    const newBatter = isWicket ? batting[nextBatterIndex] : null;

    const event = {
      _id: new mongoose.Types.ObjectId(),
      match: match._id,
      score: scoreId,
      innings,
      battingTeam: battingTeam._id,
      bowlingTeam: bowlingTeam._id,
      striker: striker._id,
      nonStriker: nonStriker._id,
      bowler: currentBowler._id,
      dismissedPlayer: isWicket ? striker._id : null,
      newBatter: newBatter?._id || null,
      over,
      ball,
      runs: batterRuns,
      batterRuns,
      extras: 0,
      extraType: 'NONE',
      totalRuns: batterRuns,
      isLegalBall: true,
      isWicket,
      wicketType: isWicket ? ['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT'][(wickets + seed) % 4] : null,
      note: '',
      ...(createdBy ? { createdBy } : {}),
      createdAt: eventTime,
      updatedAt: eventTime,
    };

    runs += batterRuns;
    balls += 1;
    if (isWicket) wickets += 1;

    events.push(event);
    commentary.push({
      match: match._id,
      scoreEvent: event._id,
      innings,
      over,
      ball,
      text: ballText(event, striker, currentBowler),
      type: commentaryType(event),
      ...(createdBy ? { createdBy, updatedBy: createdBy } : {}),
      createdAt: eventTime,
      updatedAt: eventTime,
    });

    if (isWicket) {
      striker = newBatter;
      nextBatterIndex += 1;
    }

    if (batterRuns % 2 === 1) {
      [striker, nonStriker] = [nonStriker, striker];
    }

    if (balls % 6 === 0) {
      [striker, nonStriker] = [nonStriker, striker];
    }

    if (target && runs >= target) break;
  }

  const score = {
    _id: scoreId,
    match: match._id,
    innings,
    battingTeam: battingTeam._id,
    bowlingTeam: bowlingTeam._id,
    runs,
    wickets,
    balls,
    overs: formatOvers(balls),
    runRate: calculateRunRate(runs, balls),
    target,
    currentStriker: striker?._id || null,
    currentNonStriker: nonStriker?._id || null,
    currentBowler: currentBowler?._id || null,
    ...(createdBy ? { createdBy, updatedBy: createdBy } : {}),
  };

  return { score, events, commentary };
}

class DemoDataSeeder {
  async getSeedUserId() {
    const user = await User.findOne({
      role: { $in: [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SCORER] },
      isDeleted: false,
    }).sort({ role: -1, createdAt: 1 });

    return user?._id || null;
  }

  async clearDemoData() {
    const demoSeries = await Series.find({ name: { $in: DEMO_SERIES_NAMES } }).select('_id');
    const demoSeriesIds = demoSeries.map((series) => series._id);
    const demoMatches = await SeriesMatch.find({ series: { $in: demoSeriesIds } }).select('_id');
    const demoMatchIds = demoMatches.map((match) => match._id);
    const demoTeams = await Team.find({ shortName: { $in: TEAM_BLUEPRINTS.map((team) => team.code) } }).select('_id');
    const demoTeamIds = demoTeams.map((team) => team._id);

    if (demoMatchIds.length) {
      await Promise.all([
        Commentary.deleteMany({ match: { $in: demoMatchIds } }),
        ScoreEvent.deleteMany({ match: { $in: demoMatchIds } }),
        Score.deleteMany({ match: { $in: demoMatchIds } }),
        SeriesMatch.deleteMany({ _id: { $in: demoMatchIds } }),
      ]);
    }

    if (demoSeriesIds.length) {
      await Series.deleteMany({ _id: { $in: demoSeriesIds } });
    }

    if (demoTeamIds.length) {
      await Team.deleteMany({ _id: { $in: demoTeamIds } });
    }

    const demoCountries = TEAM_BLUEPRINTS.map((team) => team.country);
    await Player.deleteMany({ country: { $in: demoCountries } });
  }

  async createPlayersAndTeams(createdBy = null) {
    const playerDocs = [];

    TEAM_BLUEPRINTS.forEach((team, teamIndex) => {
      for (let index = 0; index < team.squadSize; index += 1) {
        const role = ROLE_PATTERN[index % ROLE_PATTERN.length];
        const playerName = team.players && team.players[index] ? team.players[index] : `${team.country} Player ${String(index + 1).padStart(2, '0')}`;
        
        playerDocs.push({
          name: playerName,
          image: logoUrl(`${team.code}${index + 1}`, team.color),
          role,
          country: team.country,
          battingStyle: index % 2 === 0 ? 'RIGHT_HAND_BAT' : 'LEFT_HAND_BAT',
          bowlingStyle: ['BOWLER', 'ALL_ROUNDER'].includes(role)
            ? BOWLING_STYLES[(teamIndex + index) % BOWLING_STYLES.length]
            : null,
          ...(createdBy ? { createdBy, updatedBy: createdBy } : {}),
        });
      }
    });

    const players = await Player.insertMany(playerDocs, { ordered: true });
    const teams = [];
    let offset = 0;

    for (const blueprint of TEAM_BLUEPRINTS) {
      const teamPlayers = players.slice(offset, offset + blueprint.squadSize);
      offset += blueprint.squadSize;

      const team = await Team.create({
        name: blueprint.name,
        shortName: blueprint.code,
        logo: logoUrl(blueprint.code, blueprint.color),
        primaryColor: blueprint.color,
        status: 'PUBLISHED',
        squadPlayers: teamPlayers.map((player) => player._id),
        ...(createdBy ? { createdBy, updatedBy: createdBy } : {}),
      });

      teams.push({
        _id: team._id,
        name: team.name,
        shortName: team.shortName,
        logo: team.logo,
        primaryColor: team.primaryColor,
        players: teamPlayers,
      });
    }

    return { players, teams };
  }

  async createSeries(teams, createdBy = null) {
    const teamMap = new Map(teams.map((team) => [team.shortName, team]));
    const seriesPayloads = [
      {
        key: 'liveT20',
        name: 'Demo Premier T20 2026',
        season: '2026',
        startDate: daysFromNow(-4),
        endDate: daysFromNow(4),
        status: 'LIVE',
        format: 'B',
        matchType: 'T20',
        numberOfMatches: 4,
        teams: ['IND', 'AUS', 'ENG', 'RSA', 'NZ', 'PAK'],
      },
      {
        key: 'upcomingOdi',
        name: 'Demo World ODI Cup 2026',
        season: '2026',
        startDate: daysFromNow(2),
        endDate: daysFromNow(18),
        status: 'UPCOMING',
        format: 'B',
        matchType: 'ODI',
        numberOfMatches: 4,
        teams: ['SL', 'BAN', 'WI', 'AFG', 'IND', 'AUS'],
      },
      {
        key: 'completedT20',
        name: 'Demo Champions T20 2026',
        season: '2026',
        startDate: daysFromNow(-18),
        endDate: daysFromNow(-2),
        status: 'COMPLETED',
        format: 'C',
        matchType: 'T20',
        numberOfMatches: 4,
        teams: ['IND', 'AUS', 'ENG', 'RSA', 'NZ', 'PAK', 'SL', 'BAN', 'WI', 'AFG'],
      },
    ];

    const created = {};

    for (const payload of seriesPayloads) {
      const series = await Series.create({
        name: payload.name,
        season: payload.season,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status,
        format: payload.format,
        matchType: payload.matchType,
        numberOfMatches: payload.numberOfMatches,
        teams: payload.teams.map((code, index) => ({
          team: teamMap.get(code)._id,
          group: index % 2 === 0 ? 'A' : 'B',
        })),
        ...(createdBy ? { createdBy, updatedBy: createdBy } : {}),
      });

      created[payload.key] = series;
    }

    return created;
  }

  buildMatchPayload({ series, team1, team2, status, scheduledAt, venueIndex, tossWinner, tossDecision = 'BAT', includePlayingXi = false, createdBy = null }) {
    const payload = {
      series: series._id,
      team1: team1._id,
      team2: team2._id,
      scheduledAt,
      venue: VENUES[venueIndex % VENUES.length],
      matchType: series.matchType,
      status,
      ...(createdBy ? { createdBy, updatedBy: createdBy } : {}),
    };

    if (tossWinner) {
      payload.tossWinner = tossWinner._id;
      payload.tossDecision = tossDecision;
    }

    if (includePlayingXi) {
      payload.playingXI = {
        team1: buildLineup(team1),
        team2: buildLineup(team2),
        selectedAt: new Date(),
        ...(createdBy ? { selectedBy: createdBy } : {}),
      };
    }

    return payload;
  }

  async seedScoresForMatch(match, teams, plan, createdBy = null) {
    const allScores = [];
    const allEvents = [];
    const allCommentary = [];
    const firstBattingTeam = getTeamById(teams, plan.firstBattingTeam || getTossBattingTeam(match));
    const firstBowlingTeam = getTeamById(teams, getId(getOppositeTeam(match, firstBattingTeam._id)));
    const firstInnings = simulateInnings({
      match,
      battingTeam: firstBattingTeam,
      bowlingTeam: firstBowlingTeam,
      innings: 1,
      legalBalls: plan.firstBalls,
      wicketCount: plan.firstWickets,
      seed: plan.seed,
      createdBy,
    });

    allScores.push(firstInnings.score);
    allEvents.push(...firstInnings.events);
    allCommentary.push(...firstInnings.commentary);

    if (plan.secondBalls) {
      const secondBattingTeam = firstBowlingTeam;
      const secondBowlingTeam = firstBattingTeam;
      const secondInnings = simulateInnings({
        match,
        battingTeam: secondBattingTeam,
        bowlingTeam: secondBowlingTeam,
        innings: 2,
        legalBalls: plan.secondBalls,
        target: firstInnings.score.runs + 1,
        wicketCount: plan.secondWickets,
        seed: plan.seed + 9,
        createdBy,
      });

      allScores.push(secondInnings.score);
      allEvents.push(...secondInnings.events);
      allCommentary.push(...secondInnings.commentary);
    }

    await Score.insertMany(allScores);
    await ScoreEvent.insertMany(allEvents);
    await Commentary.insertMany(allCommentary);

    return allScores;
  }

  async createMatches(series, teams, createdBy = null) {
    const byCode = new Map(teams.map((team) => [team.shortName, team]));
    const matchPlans = [
      {
        series: series.liveT20,
        team1: byCode.get('IND'),
        team2: byCode.get('AUS'),
        status: MatchStatus.LIVE,
        scheduledAt: daysFromNow(0, 18, 30),
        venueIndex: 0,
        tossWinner: byCode.get('IND'),
        tossDecision: 'BAT',
        includePlayingXi: true,
        score: { firstBalls: 104, firstWickets: 3, seed: 1 },
      },
      {
        series: series.liveT20,
        team1: byCode.get('ENG'),
        team2: byCode.get('RSA'),
        status: MatchStatus.LIVE,
        scheduledAt: daysFromNow(0, 20, 0),
        venueIndex: 2,
        tossWinner: byCode.get('RSA'),
        tossDecision: 'BOWL',
        includePlayingXi: true,
        score: { firstBalls: 120, firstWickets: 5, secondBalls: 58, secondWickets: 2, seed: 4 },
      },
      {
        series: series.liveT20,
        team1: byCode.get('NZ'),
        team2: byCode.get('PAK'),
        status: MatchStatus.INNINGS_BREAK,
        scheduledAt: daysFromNow(0, 16, 0),
        venueIndex: 4,
        tossWinner: byCode.get('PAK'),
        tossDecision: 'BOWL',
        includePlayingXi: true,
        score: { firstBalls: 120, firstWickets: 6, seed: 7 },
      },
      {
        series: series.liveT20,
        team1: byCode.get('IND'),
        team2: byCode.get('ENG'),
        status: MatchStatus.UPCOMING,
        scheduledAt: daysFromNow(1, 19, 30),
        venueIndex: 1,
      },
      {
        series: series.upcomingOdi,
        team1: byCode.get('SL'),
        team2: byCode.get('BAN'),
        status: MatchStatus.UPCOMING,
        scheduledAt: daysFromNow(3, 14, 0),
        venueIndex: 6,
      },
      {
        series: series.upcomingOdi,
        team1: byCode.get('WI'),
        team2: byCode.get('AFG'),
        status: MatchStatus.TOSS_COMPLETED,
        scheduledAt: daysFromNow(4, 14, 0),
        venueIndex: 7,
        tossWinner: byCode.get('AFG'),
        tossDecision: 'BAT',
      },
      {
        series: series.upcomingOdi,
        team1: byCode.get('IND'),
        team2: byCode.get('SL'),
        status: MatchStatus.PLAYING_XI_SELECTED,
        scheduledAt: daysFromNow(5, 14, 0),
        venueIndex: 0,
        tossWinner: byCode.get('IND'),
        tossDecision: 'BOWL',
        includePlayingXi: true,
      },
      {
        series: series.upcomingOdi,
        team1: byCode.get('AUS'),
        team2: byCode.get('BAN'),
        status: MatchStatus.UPCOMING,
        scheduledAt: daysFromNow(6, 14, 0),
        venueIndex: 1,
      },
      {
        series: series.completedT20,
        team1: byCode.get('IND'),
        team2: byCode.get('RSA'),
        status: MatchStatus.COMPLETED,
        scheduledAt: daysFromNow(-12, 19, 30),
        venueIndex: 0,
        tossWinner: byCode.get('IND'),
        tossDecision: 'BAT',
        includePlayingXi: true,
        score: { firstBalls: 120, firstWickets: 6, secondBalls: 120, secondWickets: 8, seed: 2 },
      },
      {
        series: series.completedT20,
        team1: byCode.get('AUS'),
        team2: byCode.get('ENG'),
        status: MatchStatus.COMPLETED,
        scheduledAt: daysFromNow(-10, 19, 30),
        venueIndex: 1,
        tossWinner: byCode.get('ENG'),
        tossDecision: 'BOWL',
        includePlayingXi: true,
        score: { firstBalls: 120, firstWickets: 4, secondBalls: 120, secondWickets: 5, seed: 5 },
      },
      {
        series: series.completedT20,
        team1: byCode.get('NZ'),
        team2: byCode.get('PAK'),
        status: MatchStatus.COMPLETED,
        scheduledAt: daysFromNow(-8, 18, 30),
        venueIndex: 4,
        tossWinner: byCode.get('NZ'),
        tossDecision: 'BOWL',
        includePlayingXi: true,
        score: { firstBalls: 120, firstWickets: 7, secondBalls: 120, secondWickets: 6, seed: 8 },
      },
      {
        series: series.completedT20,
        team1: byCode.get('SL'),
        team2: byCode.get('AFG'),
        status: MatchStatus.COMPLETED,
        scheduledAt: daysFromNow(-6, 18, 30),
        venueIndex: 6,
        tossWinner: byCode.get('AFG'),
        tossDecision: 'BAT',
        includePlayingXi: true,
        score: { firstBalls: 120, firstWickets: 5, secondBalls: 120, secondWickets: 9, seed: 11 },
      },
    ];

    const matches = [];

    for (const [index, plan] of matchPlans.entries()) {
      const match = await SeriesMatch.create(this.buildMatchPayload({ ...plan, createdBy }));
      matches.push(match);

      if (plan.score) {
        const scores = await this.seedScoresForMatch(match, teams, plan.score, createdBy);

        if (plan.status === MatchStatus.COMPLETED) {
          const first = scores[0];
          const second = scores[1];
          const firstBattingTeam = getTeamById(teams, first.battingTeam);
          const secondBattingTeam = getTeamById(teams, second.battingTeam);
          const secondWon = second.runs >= first.runs + 1;
          const winner = secondWon ? secondBattingTeam : firstBattingTeam;
          const margin = secondWon
            ? `${10 - second.wickets} wickets`
            : `${first.runs - second.runs} runs`;

          await SeriesMatch.updateOne(
            { _id: match._id },
            {
              winner: winner._id,
              result: `${winner.shortName} won by ${margin}`,
              updatedAt: new Date(),
              ...(createdBy ? { updatedBy: createdBy } : {}),
            }
          );
        }
      }

      logger.info({ match: index + 1, teams: `${plan.team1.shortName} vs ${plan.team2.shortName}`, status: plan.status }, 'Demo match seeded');
    }

    return matches;
  }

  async run() {
    const createdBy = await this.getSeedUserId();
    await this.clearDemoData();

    const { players, teams } = await this.createPlayersAndTeams(createdBy);
    const series = await this.createSeries(teams, createdBy);
    const matches = await this.createMatches(series, teams, createdBy);

    logger.info(
      {
        players: players.length,
        teams: teams.length,
        series: Object.keys(series).length,
        matches: matches.length,
      },
      'Demo cricket data seeded'
    );
  }
}

const seeder = new DemoDataSeeder();
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    await connectDB();
    await seeder.run();
  } catch (error) {
    logger.error({ err: error }, 'Demo data seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

export { DemoDataSeeder };
