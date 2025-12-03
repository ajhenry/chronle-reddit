/**
 * Global phrase lists for daily games
 * Games will be created in order from these lists
 * Add new phrases to the bottom of the appropriate category
 */

export interface PhraseData {
  category: string;
  phrase: string;
}

/**
 * Lettered game phrases - these will be used in order
 * To add new games, simply append to this array
 */
export const LETTERED_PHRASES: PhraseData[] = [
  {
    phrase: 'folding a fitted sheet that actually looks decent',
    category: 'mythical achievements',
  },
  { phrase: 'eating an entire sleeve of oreos in one sitting', category: 'no regrets whatsoever' },
  {
    phrase: 'no crust peanut butter and jelly sandwich',
    category: 'childhood goto meal',
  },
  {
    phrase: 'brushing teeth right after drinking orange juice',
    category: 'a crime against humanity',
  },
  { phrase: 'finding twenty dollars in your winter coat pocket', category: 'unexpected wins' },
  { phrase: 'the smell of gasoline at a gas station', category: 'strangely satisfying scents' },
  {
    phrase: 'that one friend who always suggests applebees',
    category: 'questionable life choices',
  },
  {
    phrase: 'wearing socks with sandals to the grocery store',
    category: 'fashion statements nobody asked for',
  },
  {
    phrase: 'hitting every green light on your morning commute',
    category: 'rare moments of pure bliss',
  },
  {
    phrase: 'the wilhelm scream in every action movie ever',
    category: 'once you hear it you cant unhear it',
  },
  {
    phrase: 'the person at the theater who laughs too loud',
    category: 'ruins the whole experience',
  },
  { phrase: 'dropping your phone in the toilet by accident', category: 'preventable tragedies' },
  { phrase: 'eating cereal at midnight standing in the kitchen', category: 'peak adult behavior' },
  { phrase: 'parallel parking perfectly on the first try', category: 'showing off' },
  {
    phrase: 'stepping on a lego brick barefoot in the dark',
    category: 'enhanced interrogation techniques',
  },
  { phrase: 'arriving at the airport three hours early', category: 'anxious traveler things' },
  { phrase: 'using the same password for every thing', category: 'living dangerously' },
  {
    phrase: 'telling yourself the check engine light is fine',
    category: 'optimistic car ownership',
  },
  { phrase: 'the awkward wave when someone waves behind you', category: 'please let me disappear' },
  {
    phrase: 'googling symptoms and diagnosing yourself with every thing',
    category: 'webmd horror stories',
  },
  { phrase: 'leaving read receipts on and not responding', category: 'psychological warfare' },
  {
    phrase: 'buying girl scout cookies from a coworkers daughter',
    category: 'transactions under duress',
  },
  {
    phrase: 'the intro to law and order special victims unit',
    category: 'iconic television moments',
  },
  { phrase: 'realizing the exam is today and not tomorrow', category: 'academic horror stories' },
  { phrase: 'watching someone parallel park really badly', category: 'painfully awkward' },
  { phrase: 'eating taco bell at midnight and regretting it', category: 'decisions were made' },
  { phrase: 'the dvd screensaver bouncing into the corner', category: 'witnessing greatness' },
  { phrase: 'pretending you understand the metric system', category: 'fake it till you make it' },

  { phrase: 'getting a mosquito bite on your ankle bone', category: 'targeted attacks' },
  { phrase: 'the person who claps when the airplane lands', category: 'wholesome but annoying' },
  { phrase: 'eating pizza rolls straight from the oven', category: 'mouth roof sacrifice' },
  { phrase: 'hearing your own voice on a recording', category: 'do i really sound like that' },
  {
    phrase: 'losing one airpod and finding it three weeks later',
    category: 'emotional rollercoaster',
  },
  { phrase: 'the cashier asking if you found every thing okay', category: 'mandatory small talk' },
  {
    phrase: 'trying to act natural when security sensor beeps',
    category: 'innocent but looking guilty',
  },
  {
    phrase: 'that one embarrassing thing from five years ago',
    category: 'midnight thoughts',
  },
  {
    phrase: 'watching friends and how i met your mother for the seventh time',
    category: 'rewatching a rewatch',
  },

  { phrase: 'making eye contact through a window awkwardly', category: 'urban nightmare' },
  {
    phrase: 'the friend who always suggests the godfather again',
    category: 'peak film bro behavior',
  },
  { phrase: 'getting in a cold car on a winter morning', category: 'daily test of willpower' },
  { phrase: 'dunkin donuts coffee coolatta in the summer', category: 'something that hits hard' },
  { phrase: 'walking into a glass door you thought was open', category: 'instant humiliation' },
  { phrase: 'the random bruise on your leg with no story', category: 'unsolved mysteries' },
  { phrase: 'eating an entire rotisserie chicken by yourself', category: 'solo feast mode' },
  { phrase: 'watching infomercials at three in the morning', category: 'insomnia entertainment' },
  { phrase: 'when spotify shuffle plays the same song twice', category: 'suspicious algorithm' },
  { phrase: 'pretending to look busy when your boss walks by', category: 'workplace survival' },
  { phrase: 'drinking an entire pot of coffee before noon', category: 'necessary evil' },
  { phrase: 'trying to quietly open chips during a movie', category: 'impossible mission' },

  { phrase: 'eating an entire box of wheat thins', category: 'snacking gone wrong' },
  { phrase: 'refreshing your email every two minutes anxiously', category: 'waiting game' },
  { phrase: 'the person who uses speaker phone in public', category: 'main character syndrome' },

  { phrase: 'watching lord of the rings extended edition', category: 'marathon champion' },
  { phrase: 'eating pizza with a fork and knife', category: 'controversial methods' },
  { phrase: 'the panic when your card declines but money exists', category: 'instant stress' },
  { phrase: 'wearing the same hoodie three days in a row', category: 'signature look' },
  { phrase: 'finding out your favorite childhood place closed', category: 'generational loss' },
  { phrase: 'using incognito mode for innocent searches', category: 'better safe than sorry' },
  { phrase: 'the friend who never picks a restaurant', category: 'professional fence sitter' },
  {
    phrase: 'eating cold leftover chinese food for breakfast',
    category: 'breakfast rules are fake',
  },

  { phrase: 'matching all your socks after doing laundry', category: 'domestic victory' },
  { phrase: 'the person who responds with okay period', category: 'passive aggressive texting' },
  { phrase: 'buying something online and tracking obsessively', category: 'modern addiction' },
  {
    phrase: 'eating spaghetti with a spoon because forks dirty',
    category: 'desperate time call for desperate measures',
  },
  { phrase: 'watching youtube videos at one and a half speed', category: 'time is money' },
  { phrase: 'the panic when you cant find your phone', category: 'modern anxiety' },
  { phrase: 'eating an entire bag of baby carrots', category: 'healthy snacking achievement' },

  { phrase: 'getting into bed and the light switch is on', category: 'first world problems' },
  { phrase: 'the friend who says hang out but never plans', category: 'empty promises' },
  { phrase: 'eating shredded cheese from the bag at midnight', category: 'no judgment zone' },
  { phrase: 'forgetting reusable bags and buying more', category: 'cycle of shame' },
  { phrase: 'watching the same movie you forgot you saw', category: 'memory problems' },
  { phrase: 'hitting snooze seven times and still late', category: 'time management disaster' },
  { phrase: 'eating an entire pint of ben and jerrys alone', category: 'solo ice cream therapy' },

  {
    phrase: 'wearing headphones with no music to avoid people',
    category: 'introvert survival gear',
  },
  { phrase: 'eating chicken nuggets with barbecue sauce', category: 'college meal of choice' },
  { phrase: 'refreshing reddit every five minutes bored', category: 'procrastination station' },
  { phrase: 'the person who eats loudly in a quiet library', category: 'public enemy number one' },

  {
    phrase: 'eating all of the cream from an entire package of oreos',
    category: 'what they dont know',
  },
  {
    phrase: 'watching the same 50 office bloopers on youtube over and over',
    category: 'emotional support sitcom',
  },
  {
    phrase: 'the friend who still makes posts on facebook',
    category: 'stuck in 2002',
  },
  { phrase: 'eating tater tots from sonic in the afternoon', category: 'peak comfort food' },

  {
    phrase: 'wearing pajama pants to walmart because nobody cares',
    category: 'peak american freedom',
  },
  { phrase: 'eating an entire bag of doritos no drink', category: 'zero accountability' },
  { phrase: 'the panic when someone says we need to talk', category: 'instant dread' },
];
