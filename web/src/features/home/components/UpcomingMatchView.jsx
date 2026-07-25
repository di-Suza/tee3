import React from 'react';

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function TeamSquad({ teamName, logo, players }) {
  return (
    <div className="rounded-2xl border border-[#2a2d33] bg-[#24272c] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#1f2125] p-5 border-b border-[#2a2d33]">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt={teamName} className="h-6 w-6 rounded-full object-cover border border-[#3b3e45]" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-[#3b3e45] flex items-center justify-center text-[10px] font-bold text-white">
               {getInitials(teamName)}
            </div>
          )}
          <h3 className="text-sm font-black text-white">{teamName}<br/>Squad</h3>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-[#a0a5ad]">{players.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6d7480]">Players</p>
        </div>
      </div>
      
      {/* Player List */}
      <div className="p-4 space-y-3">
        {players.map((player, idx) => (
          <div key={idx} className="flex items-center gap-4 rounded-xl border border-[#2a2d33] bg-[#2a2d33] p-4 transition hover:border-[#3b3e45] hover:bg-[#32363d]">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7ff5f] text-xs font-black text-[#080b0a] shadow-sm">
               {player.initials || getInitials(player.name)}
             </div>
             <div>
               <p className="text-sm font-black text-white">{player.name}</p>
               <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-[#a0a5ad]">{player.role}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UpcomingMatchView({ match }) {
  // Use match data or default to mock data to match the screenshot
  const team1Name = match?.team1?.name || 'ENGLAND';
  const team2Name = match?.team2?.name || 'S. AFRICA';
  
  const team1Squad = match?.team1?.squadPlayers || [];
  const team2Squad = match?.team2?.squadPlayers || [];
  
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-[#2a2d33] bg-[#212328] shadow-lg">
         {/* Subtle background gradient */}
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_center,rgba(50,55,65,0.4),transparent_70%)]" />
         
         <div className="relative px-6 py-12 sm:px-12">
            <div className="flex items-center justify-between text-center">
              
              {/* Team 1 */}
              <div className="flex flex-col items-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[4px] border-[#2a2d33] bg-[#1a1c1e] shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                  {match?.team1?.logo ? (
                     <img src={match.team1.logo} alt={team1Name} className="h-full w-full object-cover" />
                  ) : (
                     <span className="text-2xl font-black text-[#a0a5ad]">{getInitials(team1Name)}</span>
                  )}
                </div>
                <h1 className="mt-6 text-3xl font-black uppercase tracking-widest text-white">{team1Name}</h1>
                <span className="mt-3 rounded-full border border-[#3b3e45] bg-[#1a1c1e] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#d7ff5f]">
                  {match?.series?.name || 'ODI WORLD CUP'}
                </span>
              </div>

              {/* Countdown Timer */}
              <div className="flex flex-col items-center justify-center px-4">
                 <h2 className="text-4xl font-black italic tracking-widest text-[#baff16] opacity-80 mb-6 drop-shadow-lg">VS</h2>
                 <div className="flex items-center gap-4 text-center">
                    <div>
                      <p className="text-4xl font-black text-white">02</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[#87909e]">DAYS</p>
                    </div>
                    <span className="text-3xl font-black text-[#6d7480] pb-4">:</span>
                    <div>
                      <p className="text-4xl font-black text-white">14</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[#87909e]">HRS</p>
                    </div>
                    <span className="text-3xl font-black text-[#6d7480] pb-4">:</span>
                    <div>
                      <p className="text-4xl font-black text-white">28</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[#87909e]">MINS</p>
                    </div>
                 </div>
              </div>

              {/* Team 2 */}
              <div className="flex flex-col items-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-[4px] border-[#2a2d33] bg-[#1a1c1e] shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                  {match?.team2?.logo ? (
                     <img src={match.team2.logo} alt={team2Name} className="h-full w-full object-cover" />
                  ) : (
                     <span className="text-2xl font-black text-[#a0a5ad]">{getInitials(team2Name)}</span>
                  )}
                </div>
                <h1 className="mt-6 text-3xl font-black uppercase tracking-widest text-white">{team2Name}</h1>
                <span className="mt-3 rounded-full border border-[#b89531] bg-[#292211] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#f0c541]">
                  {match?.series?.name || 'ODI WORLD CUP'}
                </span>
              </div>

            </div>

            {/* Footer */}
            <div className="mt-12 flex items-center justify-center gap-8 text-[11px] font-bold tracking-wider text-[#d3d7de] sm:gap-16">
               <div className="flex items-center gap-2">
                 <svg className="h-4 w-4 text-[#baff16]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                 <span>Saturday, Oct 14</span>
               </div>
               <div className="flex items-center gap-2">
                 <svg className="h-4 w-4 text-[#baff16]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                 <span>{match?.venue || "Lord's Cricket Ground, London"}</span>
               </div>
            </div>
         </div>
      </section>

      {/* Alert Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-[#4d3a08] bg-[#1a1403] px-5 py-4 shadow-sm">
         <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#f0c541] text-[11px] font-black text-[#f0c541]">
            i
         </div>
         <p className="text-xs font-bold tracking-wide text-[#e6d08e]">
            Playing XI is not yet selected. Stay tuned for the toss updates on match day.
         </p>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
         
         {/* Match Preview Column */}
         <div className="space-y-6">
            <div className="rounded-2xl border border-[#2a2d33] bg-[#24272c] overflow-hidden">
               {/* Image Placeholder */}
               <div className="relative h-48 bg-gradient-to-b from-[#445b73] to-[#1d2733] flex items-end p-5">
                  <div className="absolute inset-0 bg-black/20" />
                  <h3 className="relative z-10 text-lg font-black uppercase tracking-widest text-white drop-shadow-md">Match Preview</h3>
               </div>
               
               <div className="p-6">
                 <p className="text-xs leading-relaxed text-[#d3d7de]">
                   A high-octane clash awaits as England takes on South Africa in this crucial group stage encounter. Both teams have shown remarkable form in the preliminary rounds, with England's aggressive batting lineup facing off against South Africa's lethal pace attack.
                 </p>
                 <p className="mt-4 text-xs leading-relaxed text-[#d3d7de]">
                   The conditions at Lord's are expected to favor the seamers early on, making the toss vital. England will look to Jos Buttler's leadership to navigate the Proteas' disciplined bowling, while South Africa aims to exploit any overhead conditions available.
                 </p>
                 
                 <div className="mt-8 flex items-center justify-between border-t border-[#3b3e45] pt-6">
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#87909e]">Forecast</p>
                      <p className="mt-1 text-xs font-black text-[#d7ff5f]">Sunny, 22°C</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#87909e]">Pitch</p>
                      <p className="mt-1 text-xs font-black text-[#4ade80]">Green Top</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#87909e]">Capacity</p>
                      <p className="mt-1 text-xs font-black text-white">31,100</p>
                    </div>
                 </div>
               </div>
            </div>

            {/* Key Battle Player */}
            <div className="flex items-center gap-5 rounded-2xl border border-[#2a2d33] bg-[#24272c] p-5">
               <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#1d2a46] to-[#0c1524]">
                  {/* Mock player image silhoutte */}
                  <div className="h-16 w-10 bg-[#d7ff5f]/20 rounded-full" />
                  <span className="absolute -bottom-2 -right-2 rounded-md bg-[#d7ff5f] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#080b0a] border-2 border-[#24272c]">MVP</span>
               </div>
               <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#baff16]">Key Battle Player</p>
                  <p className="mt-1 text-lg font-black text-white">Mark Wood</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#d3d7de]">Crucial for early breakthroughs with 95mph+ pace.</p>
               </div>
            </div>
         </div>

         {/* Squads Split */}
         <div className="grid gap-6 lg:col-span-2 md:grid-cols-2">
           <TeamSquad teamName={team1Name} logo={match?.team1?.logo} players={team1Squad} />
           <TeamSquad teamName={team2Name} logo={match?.team2?.logo} players={team2Squad} />
         </div>

      </div>
    </div>
  );
}
