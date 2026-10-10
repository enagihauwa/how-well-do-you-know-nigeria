import type { ConnectionError } from "@naija/game/room/protocol";
import type { ModeId } from "@naija/game/modes/types";
import type { BadgeId } from "@naija/game/progress/progress";
import type { RankTierId } from "@naija/game/ranking/ranked";
import type { QuickChat } from "@naija/game/room/engine";
import type { Lang } from "./lang";

/**
 * Every player-facing string, in English and Nigerian Pidgin. Keep the Naija voice here so it can
 * be reviewed and edited in one place. Pidgin lines need a native speaker's review before launch.
 */
export interface Copy {
  languageName: string;
  home: {
    tagline: string;
    playSolo: string;
    playFriends: string;
    eyebrow: string;
    codeLabel: string;
    join: string;
    games: string;
    /** On a game tile: this player's wins in that game. */
    wins: (n: number) => string;
    stats: { categories: string; questions: string; seconds: string };
  };
  common: { back: string; next: string; seeResults: string };
  category: { titleLead: string; titleAccent: string; subtitle: string };
  quiz: { questionOf: (n: number, total: number) => string; check: string; changeHint: string };
  feedback: {
    correct: string;
    wrong: string;
    timeout: string;
    correctAnswerIs: string;
  };
  results: {
    completed: string;
    message: (score: number) => string;
    correctOf: string;
    playAgain: string;
    chooseCategory: string;
  };
  room: {
    title: string;
    createTitle: string;
    nickname: string;
    nicknamePlaceholder: string;
    create: string;
    joinTitle: string;
    code: string;
    join: string;
    nicknameRequired: string;
    codeInvalid: string;
    lobby: string;
    roomCode: string;
    copyLink: string;
    copied: string;
    inviteWhatsApp: string;
    whatsappMessage: (code: string, url: string) => string;
    players: (n: number, max: number) => string;
    host: string;
    you: string;
    noTeam: string;
    joinTeam: string;
    teamName: (n: number) => string;
    teams: string;
    addTeam: string;
    removeTeam: string;
    game: string;
    answerRule: string;
    teamLock: string;
    teamLockHint: string;
    individual: string;
    individualHint: string;
    sameRoom: string;
    sameRoomHint: string;
    start: string;
    waitingForHost: string;
    needTeam: string;
    needPlayers: string;
    leave: string;
    kick: string;
    addBot: string;
    addBotHint: string;
    disconnected: string;
    devNotice: string;
    invite: string;
    change: string;
    chooseGame: string;
    useGame: (name: string) => string;
    offline: string;
    hostOnly: string;
    category: string;
  };
  errors: Record<ConnectionError, string>;
  match: {
    teamLocked: (name: string) => string;
    waitingForTeam: string;
    youLocked: string;
    scoreboard: string;
    nextIn: (s: number) => string;
    finalTitle: string;
    winner: (team: string) => string;
    draw: string;
    backToLobby: string;
    points: string;
    answered: (n: number, total: number) => string;
    waitingForHostNext: string;
    /** Rooms without a host (Quick Play) move on by themselves. */
    autoNext: string;
    standings: string;
    /** Every player for themselves: one person won. */
    playerWins: (name: string, isYou: boolean) => string;
  };
  modes: Record<ModeId, { name: string; description: string }>;
  noTalkAm: {
    youDescribe: string;
    dontSay: string;
    gotSkip: string;
    describing: (name: string) => string;
    typeGuess: string;
    guess: string;
    correct: string;
    roundOf: (n: number, total: number) => string;
    roundOver: string;
    nextRound: string;
    cardsWon: (n: number) => string;
  };
  year: {
    placeholder: string;
    lock: string;
    answerWas: string;
    off: (n: number) => string;
    exact: string;
  };
  sort: { tapInOrder: string; reset: string; lock: string; correctOrder: string };
  chat: {
    open: string;
    title: string;
    everyone: string;
    myTeam: string;
    placeholder: string;
    send: string;
    empty: string;
    unread: (n: number) => string;
  };
  quickPlay: {
    title: string;
    subtitle: string;
    solo: string;
    soloHint: string;
    squads: string;
    squadsHint: string;
    searching: string;
    startsIn: (s: number) => string;
    waitingFor: (n: number) => string;
    botsIn: (s: number) => string;
    bot: string;
    again: string;
  };
  br: {
    lives: (n: number) => string;
    out: string;
    stillIn: (n: number, total: number) => string;
    squadsIn: (n: number) => string;
    mercy: string;
    wentOut: (names: string) => string;
    lostLife: string;
    safe: string;
    yourPlace: (n: number, total: number) => string;
    winner: (name: string) => string;
    picked: string;
    mySquad: string;
    question: (n: number) => string;
  };
  quickChat: Record<QuickChat, string>;
  tiers: Record<RankTierId, string>;
  settings: {
    open: string;
    title: string;
    look: string;
    phone: string;
    light: string;
    dark: string;
    lookHint: string;
    language: string;
    done: string;
  };
  account: {
    profile: string;
    guest: string;
    level: (n: number) => string;
    xp: (into: number, needed: number) => string;
    streak: (days: number) => string;
    saveTitle: string;
    saveBody: string;
    signUp: string;
    signIn: string;
    signOut: string;
    haveAccount: string;
    needAccount: string;
    name: string;
    email: string;
    password: string;
    passwordHint: string;
    working: string;
    errors: Record<"exists" | "badLogin" | "weakPassword" | "badEmail" | "generic" | "offline", string>;
    badges: string;
    games: string;
    wins: (n: number) => string;
    played: (n: number) => string;
    practice: (n: number) => string;
    best: (n: number) => string;
    soloName: string;
    unavailable: string;
    loading: string;
  };
  ranked: {
    title: string;
    subtitle: string;
    needAccount: string;
    unranked: string;
    placements: (left: number) => string;
    rr: (n: number) => string;
    delta: (n: number) => string;
    promoted: string;
    demoted: string;
    placed: string;
    division: (tier: string, division: number | null) => string;
    badge: string;
    peak: string;
  };
  award: {
    xp: (n: number) => string;
    levelUp: (n: number) => string;
    newBadge: string;
    practice: string;
    firstToday: string;
    streak: (days: number) => string;
    keepIt: string;
  };
  leaderboard: {
    title: string;
    open: string;
    byWins: string;
    byRank: string;
    empty: string;
    you: string;
    unavailable: string;
  };
  badges: Record<BadgeId, { name: string; hint: string }>;
  ad: string;
}

const en: Copy = {
  languageName: "English",
  home: {
    tagline: "Test your knowledge of Nigeria across different categories.",
    playSolo: "Play solo",
    playFriends: "Play with friends",
    eyebrow: "Naija trivia for you and your paddies",
    codeLabel: "Got a room code?",
    join: "Join",
    games: "Games for you and your friends",
    wins: (n) => `${n} ${n === 1 ? "win" : "wins"}`,
    stats: { categories: "Categories", questions: "Questions", seconds: "Seconds" },
  },
  common: { back: "Back", next: "Next", seeResults: "See results" },
  category: {
    titleLead: "Choose a",
    titleAccent: "category",
    subtitle: "What do you want to test?",
  },
  quiz: {
    questionOf: (n, total) => `Question ${n} of ${total}`,
    check: "Check answer",
    changeHint: "You can change your pick until time runs out.",
  },
  feedback: {
    correct: "✓ Correct! Oya, you sabi!",
    wrong: "✗ Ah, not quite!",
    timeout: "⏱ Time's up!",
    correctAnswerIs: "The correct answer is",
  },
  results: {
    completed: "Quiz completed",
    message: (score) => {
      if (score >= 90) return "Naija Expert! 🏆";
      if (score >= 70) return "Correct Naija Person! 🔥";
      if (score >= 50) return "Not Bad at All! 👍";
      return "Keep Learning! 📚";
    },
    correctOf: "correct",
    playAgain: "Play again",
    chooseCategory: "Choose another category",
  },
  room: {
    title: "Play with friends",
    createTitle: "Start a room",
    nickname: "Your name",
    nicknamePlaceholder: "e.g. Tunde",
    create: "Create room",
    joinTitle: "Have a code?",
    code: "Room code",
    join: "Join room",
    nicknameRequired: "Enter your name first.",
    codeInvalid: "Room codes are 5 letters.",
    lobby: "Lobby",
    roomCode: "Room code",
    copyLink: "Copy link",
    copied: "Copied!",
    inviteWhatsApp: "Invite on WhatsApp",
    whatsappMessage: (code, url) =>
      `Oya, come and play "How Well Do You Know Nigeria?" with me! Room code: ${code}\n${url}`,
    players: (n, max) => `Players ${n}/${max}`,
    host: "Host",
    you: "You",
    noTeam: "No team yet",
    joinTeam: "Join",
    teamName: (n) => ["Team Jollof", "Team Suya", "Team Puff-Puff", "Team Zobo"][n] ?? `Team ${n + 1}`,
    teams: "Teams",
    addTeam: "Add team",
    removeTeam: "Remove",
    game: "Game",
    answerRule: "How teams answer",
    teamLock: "One answer per team",
    teamLockHint: "The team has one pick. Any teammate can set or change it.",
    individual: "Everyone answers",
    individualHint: "Each phone answers. Team score is the total.",
    sameRoom: "We're in the same room",
    sameRoomHint: "Everyone's in one place, so just talk out loud.",
    start: "Start game",
    waitingForHost: "Waiting for the host to start…",
    needTeam: "Everyone needs to pick a team.",
    needPlayers: "You need at least 2 players.",
    leave: "Leave",
    kick: "Remove",
    addBot: "Add a bot",
    addBotHint: "No friends around? Bots fill the empty seats.",
    disconnected: "Connection lost. Trying again…",
    devNotice: "Test mode: friends join from other tabs on this device.",
    invite: "Invite",
    change: "Change",
    chooseGame: "Choose a game",
    useGame: (name) => `Play ${name}`,
    offline: "offline",
    hostOnly: "Only the host can change these.",
    category: "Category",
  },
  errors: {
    room_not_found: "We couldn't find that room. Check the code.",
    server_unreachable: "Can't reach the game server. Check your connection and try again.",
    room_full: "That room is full.",
    already_started: "That game has already started.",
    kicked: "The host removed you from the room.",
    invalid_name: "Enter a name to join.",
    not_in_room: "You're not in this room any more.",
    not_host: "Only the host can do that.",
    need_players: "You need at least 2 players.",
    need_team: "Everyone needs to pick a team.",
    need_two_per_team: "No Talk Am needs at least 2 players on every team.",
    not_enough_content: "There aren't enough questions for that yet.",
    chat_too_fast: "Slow down a little before sending more.",
    chat_blocked: "You're describing, so chat is off until the round ends.",
    bots_unsupported: "Bots can't play this game. Remove them or pick another game.",
    sign_in_required: "Ranked is for signed-up players. Sign up free to play ranked.",
    account_in_use: "Your account is already playing in this match.",
  },
  match: {
    teamLocked: (name) => `${name} picked this for the team. Anyone on the team can change it.`,
    waitingForTeam: "Waiting for the others…",
    youLocked: "Picked. You can still change it.",
    scoreboard: "Scores",
    nextIn: (s) => `Next question in ${s}s`,
    finalTitle: "Match over",
    winner: (team) => `${team} win!`,
    draw: "It's a draw!",
    backToLobby: "Back to lobby",
    points: "pts",
    answered: (n, total) => `${n} of ${total} answered`,
    waitingForHostNext: "Waiting for the host…",
    autoNext: "Next round starts by itself…",
    standings: "Standings",
    playerWins: (name, isYou) => (isYou ? "You win!" : `${name} wins!`),
  },
  modes: {
    trivia: { name: "Trivia", description: "10 questions about Nigeria. Beat the timer." },
    "no-talk-am": { name: "No Talk Am", description: "Describe the word to your team without the banned words." },
    "guess-the-year": { name: "Guess the Year", description: "When did it happen? Closest guess wins." },
    "sort-am": { name: "Sort Am", description: "Put four things in the right order." },
    "battle-royale": { name: "Who Go Remain?", description: "Battle royale. A wrong answer costs a life. Last one standing wins." },
  },
  noTalkAm: {
    youDescribe: "You're describing",
    dontSay: "Don't say",
    gotSkip: "Skip",
    describing: (name) => `${name} is describing. Listen and guess!`,
    typeGuess: "Type your guess",
    guess: "Guess",
    correct: "Correct!",
    roundOf: (n, total) => `Round ${n} of ${total}`,
    roundOver: "Round over",
    nextRound: "Next round",
    cardsWon: (n) => `${n} ${n === 1 ? "card" : "cards"}`,
  },
  year: {
    placeholder: "e.g. 1960",
    lock: "Lock year",
    answerWas: "The answer was",
    off: (n) => `${n} ${n === 1 ? "year" : "years"} off`,
    exact: "Exact!",
  },
  sort: {
    tapInOrder: "Tap them in order, first to last.",
    reset: "Start again",
    lock: "Lock order",
    correctOrder: "Correct order",
  },
  chat: {
    open: "Chat",
    title: "Chat",
    everyone: "Everyone",
    myTeam: "My team",
    placeholder: "Write a message",
    send: "Send",
    empty: "No messages yet. Say hello.",
    unread: (n) => `${n} new ${n === 1 ? "message" : "messages"}`,
  },

  quickPlay: {
    title: "Quick play",
    subtitle: "Play against people across Naija, no code needed.",
    solo: "Who Go Remain?",
    soloHint: "Everyone for themselves. Up to 50 players. Last one standing wins.",
    squads: "Squad Who Go Remain?",
    squadsHint: "Squads of 3. Your squad stays in while any of you is in.",
    searching: "Finding players…",
    startsIn: (s) => `Starting in ${s}s`,
    waitingFor: (n) => `Waiting for ${n} more ${n === 1 ? "player" : "players"}`,
    botsIn: (s) => `Not enough players yet. Bots join in ${s}s.`,
    bot: "bot",
    again: "Play again",
  },
  br: {
    lives: (n) => `${n} ${n === 1 ? "life" : "lives"} left`,
    out: "You're out. Watching the rest.",
    stillIn: (n, total) => `${n} of ${total} still in`,
    squadsIn: (n) => `${n} ${n === 1 ? "squad" : "squads"} left`,
    mercy: "Everybody missed that one, so nobody loses a life.",
    wentOut: (names) => `Out: ${names}`,
    lostLife: "You lost a life",
    safe: "Correct! You're still in",
    yourPlace: (n, total) => `You finished #${n} of ${total}`,
    winner: (name) => `${name} remain!`,
    picked: "picked",
    mySquad: "My squad",
    question: (n) => `Question ${n}`,
  },
  quickChat: { oya: "Oya! 🔥", nice: "Nice one", wp: "Well played", gg: "Good game", chai: "Chai!", ehen: "Ehen!", lol: "😂", fast: "Too fast!" },
  tiers: { jjc: "JJC", learner: "Learner", sharp: "Sharp", oga: "Oga", chairman: "Chairman", odogwu: "Odogwu" },
  settings: {
    open: "Settings",
    title: "Settings",
    look: "Look",
    phone: "Phone",
    light: "Light",
    dark: "Dark",
    lookHint: "Phone follows your phone's light or dark setting.",
    language: "Language",
    done: "Done",
  },
  account: {
    profile: "Profile",
    guest: "Guest",
    level: (n) => `Level ${n}`,
    xp: (into, needed) => `${into} / ${needed} XP`,
    streak: (days) => `${days}-day streak`,
    saveTitle: "Keep your progress",
    saveBody: "You're playing as a guest. Sign up free to keep your XP, badges and wins on any phone, show on the leaderboards, and play ranked.",
    signUp: "Sign up",
    signIn: "Sign in",
    signOut: "Sign out",
    haveAccount: "Already have an account? Sign in",
    needAccount: "New here? Sign up",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters",
    working: "One moment…",
    errors: {
      exists: "That email already has an account. Sign in instead.",
      badLogin: "Wrong email or password.",
      weakPassword: "Use at least 8 characters.",
      badEmail: "That email doesn't look right.",
      generic: "Something went wrong. Try again.",
      offline: "Can't reach the game server. Check your connection.",
    },
    badges: "Badges",
    games: "Your games",
    wins: (n) => `${n} ${n === 1 ? "win" : "wins"}`,
    played: (n) => `${n} played`,
    practice: (n) => `${n} vs bots`,
    best: (n) => `Best ${n}`,
    soloName: "Solo quiz",
    unavailable: "Profiles need the game server. Run npm run dev to start it with the app.",
    loading: "Loading your profile…",
  },
  ranked: {
    title: "Ranked",
    subtitle: "Every player for themselves. Win to gain RR, lose and you drop. No bots.",
    needAccount: "Sign up free to play ranked.",
    unranked: "Unranked",
    placements: (left) => `${left} placement ${left === 1 ? "match" : "matches"} left`,
    rr: (n) => `${n} RR`,
    delta: (n) => `${n >= 0 ? "+" : "−"}${Math.abs(n)} RR`,
    promoted: "Promoted!",
    demoted: "Demoted",
    placed: "Your rank is in!",
    division: (tier, division) => (division ? `${tier} ${division}` : tier),
    badge: "Ranked",
    peak: "Peak",
  },
  award: {
    xp: (n) => `+${n} XP`,
    levelUp: (n) => `Level up! You're now level ${n}`,
    newBadge: "New badge",
    practice: "Practice vs bots: half XP, no wins.",
    firstToday: "First game today: +10 XP",
    streak: (days) => `${days}-day streak`,
    keepIt: "Sign up to keep it",
  },
  leaderboard: {
    title: "Leaderboards",
    open: "Leaderboards",
    byWins: "Most wins",
    byRank: "Top ranked",
    empty: "Nobody here yet. Win a game against friends to be first.",
    you: "You",
    unavailable: "Leaderboards need the game server.",
  },
  badges: {
    first_game: { name: "Welcome", hint: "Play your first game" },
    first_win: { name: "First Win", hint: "Win a game against people" },
    ten_wins: { name: "Ten Wins", hint: "Win 10 games" },
    fifty_wins: { name: "Fifty Wins", hint: "Win 50 games" },
    streak_3: { name: "On a Roll", hint: "Play 3 days in a row" },
    streak_7: { name: "Every Day", hint: "Play 7 days in a row" },
    streak_30: { name: "No Dull", hint: "Play 30 days in a row" },
    all_games: { name: "All-Rounder", hint: "Play every game" },
    perfect_quiz: { name: "Ten Over Ten", hint: "Get every question right in a quiz" },
    bullseye: { name: "Bullseye", hint: "Guess a year exactly" },
    sorted: { name: "Sorted", hint: "Sort every item right in Sort Am" },
    last_one_standing: { name: "Last One Standing", hint: "Win Who Go Remain?" },
    wordsmith: { name: "Wordsmith", hint: "Describe 25 words in No Talk Am" },
    oga: { name: "Oga at the Top", hint: "Reach Oga in ranked" },
    level_10: { name: "Big Player", hint: "Reach level 10" },
  },
  ad: "Advertisement",
};

const pcm: Copy = {
  languageName: "Pidgin",
  home: {
    tagline: "Show say you sabi Naija well well. Pick category, make we see.",
    playSolo: "Play your own",
    playFriends: "Play with your paddies",
    eyebrow: "Naija trivia for you and your paddies",
    codeLabel: "You get room code?",
    join: "Enter",
    games: "Games wey you fit play with your paddies",
    wins: (n) => `${n} ${n === 1 ? "win" : "wins"}`,
    stats: { categories: "Categories", questions: "Questions", seconds: "Seconds" },
  },
  common: { back: "Go back", next: "Next one", seeResults: "See wetin you score" },
  category: {
    titleLead: "Choose",
    titleAccent: "category",
    subtitle: "Which one you wan try?",
  },
  quiz: {
    questionOf: (n, total) => `Question ${n} out of ${total}`,
    check: "Check am",
    changeHint: "You fit change your pick before time finish.",
  },
  feedback: {
    correct: "✓ Oya! You sabi!",
    wrong: "✗ Ah, e no reach!",
    timeout: "⏱ You dey sleep? Time don finish!",
    correctAnswerIs: "The correct answer na",
  },
  results: {
    completed: "You don finish",
    message: (score) => {
      if (score >= 90) return "Naija no dey carry last! 🏆";
      if (score >= 70) return "You try well well! 🔥";
      if (score >= 50) return "E no bad sha! 👍";
      return "Abeg go read small! 📚";
    },
    correctOf: "correct",
    playAgain: "Play again",
    chooseCategory: "Choose another category",
  },
  room: {
    title: "Play with your paddies",
    createTitle: "Open room",
    nickname: "Your name",
    nicknamePlaceholder: "e.g. Tunde",
    create: "Open room",
    joinTitle: "You get code?",
    code: "Room code",
    join: "Enter room",
    nicknameRequired: "Abeg put your name first.",
    codeInvalid: "Room code na 5 letters.",
    lobby: "Lobby",
    roomCode: "Room code",
    copyLink: "Copy link",
    copied: "E don copy!",
    inviteWhatsApp: "Call dem for WhatsApp",
    whatsappMessage: (code, url) =>
      `Oya come make we play "How Well Do You Know Nigeria?"! Room code na ${code}\n${url}`,
    players: (n, max) => `Players ${n}/${max}`,
    host: "Oga",
    you: "You",
    noTeam: "No team yet",
    joinTeam: "Enter",
    teamName: (n) => ["Team Jollof", "Team Suya", "Team Puff-Puff", "Team Zobo"][n] ?? `Team ${n + 1}`,
    teams: "Teams",
    addTeam: "Add team",
    removeTeam: "Comot",
    game: "Game",
    answerRule: "How teams go answer",
    teamLock: "One answer for each team",
    teamLockHint: "Una get one pick. Anybody for the team fit choose or change am.",
    individual: "Everybody go answer",
    individualHint: "Each phone go answer. Team score na the total.",
    sameRoom: "We dey the same place",
    sameRoomHint: "Una dey the same place, so just talk out.",
    start: "Start am",
    waitingForHost: "We dey wait for Oga to start…",
    needTeam: "Everybody must pick team.",
    needPlayers: "You need at least 2 people.",
    leave: "Comot",
    kick: "Comot am",
    addBot: "Add bot",
    addBotHint: "Your paddies no dey? Bots go fill the space.",
    disconnected: "Network don cut. We dey try again…",
    devNotice: "Test mode: your paddies fit join from other tabs for this device.",
    invite: "Invite",
    change: "Change am",
    chooseGame: "Choose game",
    useGame: (name) => `Play ${name}`,
    offline: "no dey",
    hostOnly: "Na only Oga fit change am.",
    category: "Category",
  },
  errors: {
    room_not_found: "We no see that room. Check the code again.",
    server_unreachable: "We no fit reach the server. Check your network try again.",
    room_full: "That room don full.",
    already_started: "Dem don start that game already.",
    kicked: "Oga don comot you from the room.",
    invalid_name: "Abeg put your name.",
    not_in_room: "You no dey this room again.",
    not_host: "Na only Oga fit do am.",
    need_players: "You need at least 2 people.",
    need_team: "Everybody must pick team.",
    need_two_per_team: "No Talk Am need at least 2 people for every team.",
    not_enough_content: "Questions never reach for that one yet.",
    chat_too_fast: "Take am easy small before you send again.",
    chat_blocked: "Na you dey explain, so chat off till the round finish.",
    bots_unsupported: "Bots no fit play this game. Comot dem or pick another game.",
    sign_in_required: "Ranked na for people wey don sign up. Sign up free make you play ranked.",
    account_in_use: "Your account don already dey play for this match.",
  },
  match: {
    teamLocked: (name) => `${name} pick am for the team. Anybody for the team fit change am.`,
    waitingForTeam: "We dey wait for the others…",
    youLocked: "You don pick. You fit still change am.",
    scoreboard: "Scores",
    nextIn: (s) => `Next question go come in ${s}s`,
    finalTitle: "Game don end",
    winner: (team) => `${team} carry first!`,
    draw: "Una draw!",
    backToLobby: "Go back lobby",
    points: "pts",
    answered: (n, total) => `${n} out of ${total} don answer`,
    waitingForHostNext: "We dey wait for Oga…",
    autoNext: "Next round go start by itself…",
    standings: "Standings",
    playerWins: (name, isYou) => (isYou ? "You win am!" : `${name} carry first!`),
  },
  modes: {
    trivia: { name: "Trivia", description: "10 questions about Naija. Beat the time." },
    "no-talk-am": { name: "No Talk Am", description: "Explain the word give your team, but no talk the banned words." },
    "guess-the-year": { name: "Guess the Year", description: "Which year e happen? Who near pass, win." },
    "sort-am": { name: "Sort Am", description: "Arrange the four things well." },
    "battle-royale": { name: "Who Go Remain?", description: "Battle royale. Wrong answer go cost you life. Who remain last, win." },
  },
  noTalkAm: {
    youDescribe: "Na you dey explain",
    dontSay: "No talk",
    gotSkip: "Skip",
    describing: (name) => `${name} dey explain. Listen well and guess!`,
    typeGuess: "Type wetin you think",
    guess: "Guess",
    correct: "You get am!",
    roundOf: (n, total) => `Round ${n} out of ${total}`,
    roundOver: "Round don finish",
    nextRound: "Next round",
    cardsWon: (n) => `${n} ${n === 1 ? "card" : "cards"}`,
  },
  year: {
    placeholder: "e.g. 1960",
    lock: "Lock am",
    answerWas: "The answer na",
    off: (n) => `You miss am by ${n} ${n === 1 ? "year" : "years"}`,
    exact: "Na exactly am!",
  },
  sort: {
    tapInOrder: "Tap dem one by one, first to last.",
    reset: "Start again",
    lock: "Lock am",
    correctOrder: "Correct arrangement",
  },
  chat: {
    open: "Chat",
    title: "Chat",
    everyone: "Everybody",
    myTeam: "My team",
    placeholder: "Type something",
    send: "Send",
    empty: "Nobody don talk yet. Greet dem.",
    unread: (n) => `${n} new ${n === 1 ? "message" : "messages"}`,
  },

  quickPlay: {
    title: "Quick play",
    subtitle: "Play with people from all over Naija, no code needed.",
    solo: "Who Go Remain?",
    soloHint: "Everybody for himself. Reach 50 players. Who remain last, win.",
    squads: "Squad Who Go Remain?",
    squadsHint: "Squad of 3. Una squad dey inside as long as one of una still dey.",
    searching: "We dey find people…",
    startsIn: (s) => `E go start in ${s}s`,
    waitingFor: (n) => `We dey wait for ${n} more`,
    botsIn: (s) => `People never reach. Bots go join in ${s}s.`,
    bot: "bot",
    again: "Play again",
  },
  br: {
    lives: (n) => `${n} ${n === 1 ? "life" : "lives"} remain`,
    out: "You don comot. You dey watch the rest.",
    stillIn: (n, total) => `${n} out of ${total} still dey`,
    squadsIn: (n) => `${n} ${n === 1 ? "squad" : "squads"} remain`,
    mercy: "Everybody miss am, so nobody lose life.",
    wentOut: (names) => `Don comot: ${names}`,
    lostLife: "You don lose one life",
    safe: "Correct! You still dey",
    yourPlace: (n, total) => `You finish number ${n} out of ${total}`,
    winner: (name) => `${name} remain!`,
    picked: "pick am",
    mySquad: "My squad",
    question: (n) => `Question ${n}`,
  },
  quickChat: { oya: "Oya! 🔥", nice: "Nice one", wp: "You try", gg: "Good game", chai: "Chai!", ehen: "Ehen!", lol: "😂", fast: "Una fast o!" },
  tiers: { jjc: "JJC", learner: "Learner", sharp: "Sharp", oga: "Oga", chairman: "Chairman", odogwu: "Odogwu" },
  settings: {
    open: "Settings",
    title: "Settings",
    look: "How e go look",
    phone: "Phone",
    light: "Light",
    dark: "Dark",
    lookHint: "Phone go follow wetin your phone set, light or dark.",
    language: "Language",
    done: "Done",
  },
  account: {
    profile: "Profile",
    guest: "Guest",
    level: (n) => `Level ${n}`,
    xp: (into, needed) => `${into} / ${needed} XP`,
    streak: (days) => `${days} days straight`,
    saveTitle: "Keep wetin you don gather",
    saveBody: "You dey play as guest. Sign up free make your XP, badges and wins follow you for any phone, make your name show for leaderboard, and make you fit play ranked.",
    signUp: "Sign up",
    signIn: "Sign in",
    signOut: "Sign out",
    haveAccount: "You get account already? Sign in",
    needAccount: "You be new? Sign up",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 letters or numbers",
    working: "Small time…",
    errors: {
      exists: "This email get account already. Sign in instead.",
      badLogin: "Email or password no correct.",
      weakPassword: "Use at least 8 characters.",
      badEmail: "This email no look correct.",
      generic: "Something spoil. Try again.",
      offline: "We no fit reach the game server. Check your network.",
    },
    badges: "Badges",
    games: "Your games",
    wins: (n) => `${n} ${n === 1 ? "win" : "wins"}`,
    played: (n) => `${n} played`,
    practice: (n) => `${n} vs bots`,
    best: (n) => `Best ${n}`,
    soloName: "Solo quiz",
    unavailable: "Profile need the game server. Run npm run dev make e start with the app.",
    loading: "We dey load your profile…",
  },
  ranked: {
    title: "Ranked",
    subtitle: "Everybody for himself. Win, your RR go up; lose, e go down. No bots.",
    needAccount: "Sign up free make you play ranked.",
    unranked: "No rank yet",
    placements: (left) => `${left} placement ${left === 1 ? "match" : "matches"} remain`,
    rr: (n) => `${n} RR`,
    delta: (n) => `${n >= 0 ? "+" : "−"}${Math.abs(n)} RR`,
    promoted: "You don climb!",
    demoted: "You don drop",
    placed: "Your rank don land!",
    division: (tier, division) => (division ? `${tier} ${division}` : tier),
    badge: "Ranked",
    peak: "Highest",
  },
  award: {
    xp: (n) => `+${n} XP`,
    levelUp: (n) => `Level up! You don reach level ${n}`,
    newBadge: "New badge",
    practice: "Practice with bots: half XP, no wins.",
    firstToday: "First game today: +10 XP",
    streak: (days) => `${days} days straight`,
    keepIt: "Sign up make e no waste",
  },
  leaderboard: {
    title: "Leaderboard",
    open: "Leaderboard",
    byWins: "Pass everybody for wins",
    byRank: "Top rank",
    empty: "Nobody dey here yet. Win game with your paddies make you be first.",
    you: "You",
    unavailable: "Leaderboard need the game server.",
  },
  badges: {
    first_game: { name: "Welcome", hint: "Play your first game" },
    first_win: { name: "First Win", hint: "Win one game against people" },
    ten_wins: { name: "Ten Wins", hint: "Win 10 games" },
    fifty_wins: { name: "Fifty Wins", hint: "Win 50 games" },
    streak_3: { name: "E Don Start", hint: "Play 3 days straight" },
    streak_7: { name: "Every Every Day", hint: "Play 7 days straight" },
    streak_30: { name: "No Dull", hint: "Play 30 days straight" },
    all_games: { name: "All-Rounder", hint: "Play every game" },
    perfect_quiz: { name: "Ten Over Ten", hint: "Answer every question correct for one quiz" },
    bullseye: { name: "Bullseye", hint: "Guess the exact year" },
    sorted: { name: "Sorted", hint: "Arrange everything correct for Sort Am" },
    last_one_standing: { name: "Last Man Standing", hint: "Win Who Go Remain?" },
    wordsmith: { name: "Wordsmith", hint: "Explain 25 words for No Talk Am" },
    oga: { name: "Oga at the Top", hint: "Reach Oga for ranked" },
    level_10: { name: "Big Player", hint: "Reach level 10" },
  },
  ad: "Advertisement",
};

export const copy: Record<Lang, Copy> = { en, pcm };
