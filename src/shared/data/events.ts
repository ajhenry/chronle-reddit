// Chronle Event Database
// All events with Reddit-hosted image URLs
// Run `pnpm run upload-images` to convert external URLs to Reddit URLs

export interface ChronleEventData {
  id: string;
  title: string;
  description: string;
  subject: string;
  imageUrl: string; // Reddit-hosted URL (i.redd.it)
  imageCreditName: string;
  imageCreditUrl: string;
  date: string; // ISO date string
}

export interface PuzzleData {
  id: string;
  title: string;
  description: string;
  events: ChronleEventData[];
}

// Space Exploration Timeline
const spaceExplorationEvents: ChronleEventData[] = [
  {
    id: 'sputnik',
    title: 'Sputnik 1 Launch',
    description: 'The Soviet Union launches the first artificial satellite',
    subject: 'Space',
    imageUrl: 'https://i.redd.it/placeholder-sputnik.jpg', // TODO: Upload to Reddit
    imageCreditName: 'NASA',
    imageCreditUrl: 'https://nasa.gov',
    date: '1957-10-04T00:00:00.000Z',
  },
  {
    id: 'gagarin',
    title: 'Yuri Gagarin in Space',
    description: 'First human to journey into outer space',
    subject: 'Space',
    imageUrl: 'https://i.redd.it/placeholder-gagarin.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Wikipedia',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1961-04-12T00:00:00.000Z',
  },
  {
    id: 'moon-landing',
    title: 'Apollo 11 Moon Landing',
    description: 'First humans walk on the Moon',
    subject: 'Space',
    imageUrl: 'https://i.redd.it/placeholder-moon.jpg', // TODO: Upload to Reddit
    imageCreditName: 'NASA',
    imageCreditUrl: 'https://nasa.gov',
    date: '1969-07-20T00:00:00.000Z',
  },
  {
    id: 'space-shuttle',
    title: 'First Space Shuttle Launch',
    description: 'Columbia becomes the first reusable spacecraft to reach orbit',
    subject: 'Space',
    imageUrl: 'https://i.redd.it/placeholder-shuttle.jpg', // TODO: Upload to Reddit
    imageCreditName: 'NASA',
    imageCreditUrl: 'https://nasa.gov',
    date: '1981-04-12T00:00:00.000Z',
  },
  {
    id: 'hubble',
    title: 'Hubble Space Telescope Launch',
    description: 'The Hubble Space Telescope is deployed into orbit',
    subject: 'Space',
    imageUrl: 'https://i.redd.it/placeholder-hubble.jpg', // TODO: Upload to Reddit
    imageCreditName: 'NASA',
    imageCreditUrl: 'https://nasa.gov',
    date: '1990-04-24T00:00:00.000Z',
  },
  {
    id: 'iss',
    title: 'ISS First Crew',
    description: 'First permanent crew arrives at the International Space Station',
    subject: 'Space',
    imageUrl: 'https://i.redd.it/placeholder-iss.jpg', // TODO: Upload to Reddit
    imageCreditName: 'NASA',
    imageCreditUrl: 'https://nasa.gov',
    date: '2000-11-02T00:00:00.000Z',
  },
];

// Internet & Technology Timeline
const internetTechEvents: ChronleEventData[] = [
  {
    id: 'arpanet',
    title: 'ARPANET First Message',
    description: 'First message sent over ARPANET, the precursor to the internet',
    subject: 'Technology',
    imageUrl: 'https://i.redd.it/placeholder-arpanet.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Wikipedia',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1969-10-29T00:00:00.000Z',
  },
  {
    id: 'email',
    title: 'First Email Sent',
    description: 'Ray Tomlinson sends the first network email',
    subject: 'Technology',
    imageUrl: 'https://i.redd.it/placeholder-email.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Wikipedia',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1971-01-01T00:00:00.000Z',
  },
  {
    id: 'www',
    title: 'World Wide Web Invented',
    description: 'Tim Berners-Lee invents the World Wide Web',
    subject: 'Technology',
    imageUrl: 'https://i.redd.it/placeholder-www.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Wikipedia',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1989-03-12T00:00:00.000Z',
  },
  {
    id: 'google',
    title: 'Google Founded',
    description: 'Larry Page and Sergey Brin found Google',
    subject: 'Technology',
    imageUrl: 'https://i.redd.it/placeholder-google.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Google',
    imageCreditUrl: 'https://google.com',
    date: '1998-09-04T00:00:00.000Z',
  },
  {
    id: 'facebook',
    title: 'Facebook Launches',
    description: 'Mark Zuckerberg launches Facebook from his Harvard dorm room',
    subject: 'Technology',
    imageUrl: 'https://i.redd.it/placeholder-facebook.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Facebook',
    imageCreditUrl: 'https://facebook.com',
    date: '2004-02-04T00:00:00.000Z',
  },
  {
    id: 'iphone',
    title: 'iPhone Released',
    description: 'Apple releases the first iPhone, revolutionizing smartphones',
    subject: 'Technology',
    imageUrl: 'https://i.redd.it/placeholder-iphone.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Apple',
    imageCreditUrl: 'https://apple.com',
    date: '2007-06-29T00:00:00.000Z',
  },
];

// World Wars Timeline
const worldWarsEvents: ChronleEventData[] = [
  {
    id: 'archduke',
    title: 'Assassination of Archduke Franz Ferdinand',
    description: 'The event that triggered World War I',
    subject: 'History',
    imageUrl: 'https://i.redd.it/placeholder-archduke.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Wikipedia',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1914-06-28T00:00:00.000Z',
  },
  {
    id: 'versailles',
    title: 'Treaty of Versailles Signed',
    description: 'The peace treaty that ended World War I',
    subject: 'History',
    imageUrl: 'https://i.redd.it/placeholder-versailles.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Wikipedia',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1919-06-28T00:00:00.000Z',
  },
  {
    id: 'poland',
    title: 'Germany Invades Poland',
    description: 'The invasion that started World War II',
    subject: 'History',
    imageUrl: 'https://i.redd.it/placeholder-poland.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Bundesarchiv',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1939-09-01T00:00:00.000Z',
  },
  {
    id: 'pearl-harbor',
    title: 'Attack on Pearl Harbor',
    description: 'Japan attacks the US naval base, bringing America into WWII',
    subject: 'History',
    imageUrl: 'https://i.redd.it/placeholder-pearl-harbor.jpg', // TODO: Upload to Reddit
    imageCreditName: 'US Navy',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1941-12-07T00:00:00.000Z',
  },
  {
    id: 'd-day',
    title: 'D-Day Normandy Landings',
    description: 'Allied forces invade Nazi-occupied France',
    subject: 'History',
    imageUrl: 'https://i.redd.it/placeholder-dday.jpg', // TODO: Upload to Reddit
    imageCreditName: 'US Coast Guard',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1944-06-06T00:00:00.000Z',
  },
  {
    id: 've-day',
    title: 'Victory in Europe Day',
    description: 'Germany surrenders, ending WWII in Europe',
    subject: 'History',
    imageUrl: 'https://i.redd.it/placeholder-veday.jpg', // TODO: Upload to Reddit
    imageCreditName: 'Wikipedia',
    imageCreditUrl: 'https://wikipedia.org',
    date: '1945-05-08T00:00:00.000Z',
  },
];

// All puzzles
export const puzzles: PuzzleData[] = [
  {
    id: 'space-exploration',
    title: 'Space Exploration Milestones',
    description: 'Order these space exploration events from earliest to most recent',
    events: spaceExplorationEvents,
  },
  {
    id: 'internet-history',
    title: 'Internet & Technology',
    description: 'Order these internet and technology milestones chronologically',
    events: internetTechEvents,
  },
  {
    id: 'world-wars',
    title: 'World War Events',
    description: 'Order these major World War events from earliest to latest',
    events: worldWarsEvents,
  },
];

// Get all events as a flat list
export function getAllEvents(): ChronleEventData[] {
  return puzzles.flatMap((puzzle) => puzzle.events);
}

// Get puzzle by ID
export function getPuzzleById(id: string): PuzzleData | undefined {
  return puzzles.find((puzzle) => puzzle.id === id);
}

// Get puzzle for a specific day (rotates through available puzzles)
export function getPuzzleForDay(dayString: string): PuzzleData {
  const date = new Date(dayString);
  const startDate = new Date('2025-01-01');
  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const puzzleIndex = Math.abs(daysDiff) % puzzles.length;
  return puzzles[puzzleIndex]!;
}

// Source image URLs for upload script
// These are the original URLs that need to be uploaded to Reddit
export const sourceImageUrls: Record<string, string> = {
  sputnik: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Sputnik_asm.jpg',
  gagarin: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Yuri_Gagarin_%281961%29.jpg',
  'moon-landing': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Aldrin_Apollo_11_original.jpg',
  'space-shuttle': 'https://upload.wikimedia.org/wikipedia/commons/d/d6/STS-1_Columbia_launching.jpg',
  hubble: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/HST-SM4.jpeg',
  iss: 'https://upload.wikimedia.org/wikipedia/commons/0/04/International_Space_Station_after_undocking_of_STS-132.jpg',
  arpanet: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Arpanet_logical_map%2C_march_1977.png',
  email: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Ray_Tomlinson.jpg',
  www: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Sir_Tim_Berners-Lee_%28cropped%29.jpg',
  google: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
  facebook: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png',
  iphone: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/IPhone_1st_Gen.svg',
  archduke: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Archduke_Franz_Ferdinand_of_Austria_-_b%26w.jpg',
  versailles: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Treaty_of_Versailles_Signing%2C_Hall_of_Mirrors.jpg',
  poland: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Bundesarchiv_Bild_183-51909-0003%2C_Polen%2C_Schlagbaum%2C_deutsche_Soldaten.jpg',
  'pearl-harbor': 'https://upload.wikimedia.org/wikipedia/commons/0/09/The_USS_Arizona_%28BB-39%29_burning_after_the_Japanese_attack_on_Pearl_Harbor_-_NARA_195617_-_Edit.jpg',
  'd-day': 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg',
  've-day': 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Crowds_celebrating_VE_Day_in_London.jpg',
};

