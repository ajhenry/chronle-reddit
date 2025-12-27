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
export const RANDOM_LETTERED_PHRASES: PhraseData[] = [
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

export const DAILY_LETTERED_PHRASES: PhraseData[] = [
  {
    phrase: 'leaving leftovers in the microwave overnight',
    category: 'tomorrow morning surprise sad moment',
  },
  {
    phrase: 'holding the door for someone way too far away',
    category: 'now we are both awkward',
  },
  {
    phrase: 'faking like you know the song lyrics and mumbling',
    category: 'nobody will notice right',
  },
  {
    phrase: 'eating popcorn kernels at the bottom of the bag',
    category: 'dental work is pricey',
  },
  {
    phrase: 'watching youtube tutorials and never doing it',
    category: 'learning by osmosis does not work',
  },
  {
    phrase: 'getting a hair stuck in your mouth somehow',
    category: 'ruins your entire day',
  },
  {
    phrase: 'wearing sunglasses indoors after the eye doctor',
    category: 'temporary vampire mode',
  },
  {
    phrase: 'eating string cheese without peeling it first',
    category: 'total psycho behavior',
  },
  {
    phrase: 'leaving dishes to soak for three days straight',
    category: 'things that clean themselves',
  },
  {
    phrase: 'hitting reply all on an email by accident',
    category: 'career ending mistakes',
  },
  {
    phrase: 'eating cereal with water because the milk expired',
    category: 'rock bottom',
  },
  {
    phrase: 'saying you too when the waiter says enjoy your meal',
    category: 'socially awkward autopilot',
  },
  {
    phrase: 'wearing the same outfit twice in one week at work',
    category: 'hoping nobody notices',
  },
  {
    phrase: 'opening the fridge over and over expecting new food',
    category: 'definition of insanity',
  },
  {
    phrase: 'walking into a room and blanking on why instantly',
    category: 'brain lag moment',
  },
  {
    phrase: 'buying a salad to feel healthy then adding ranch',
    category: 'self deception tactics',
  },
  {
    phrase: 'putting on pants fresh from the dryer still warm',
    category: 'small luxuries in life',
  },
  {
    phrase: 'eating chips in bed and finding crumbs for weeks',
    category: 'personal crime scene',
  },
  {
    phrase: 'googling something obvious you should know already',
    category: 'nobody can know about this',
  },
  {
    phrase: 'wearing sweats to a zoom meeting below the camera',
    category: 'nobody needs to know',
  },
  {
    phrase: 'eating fries that fell in the car seat last week',
    category: 'five second rule extended',
  },
  {
    phrase: 'adding items to your cart and never checking out',
    category: 'just browsing forever',
  },
  {
    phrase: 'saying bless you to your own sneeze out loud',
    category: "when you're home alone",
  },
  {
    phrase: 'eating cookie dough straight from the tube raw',
    category: 'worth the risk',
  },
  {
    phrase: 'turning the music down to see better while driving',
    category: 'odd things that help',
  },
  {
    phrase: 'using your phone light to find your phone',
    category: 'wait a minute',
  },
  {
    phrase: 'eating breakfast food for dinner',
    category: 'superior meal choice',
  },
  {
    phrase: 'clicking i agree without reading any fine print',
    category: 'what could go wrong',
  },
  {
    phrase: 'putting toilet paper roll on backwards',
    category: 'split population',
  },
  {
    phrase: 'smelling the milk to see if it went bad already',
    category: 'playing with fire',
  },
  {
    phrase: 'walking faster when someone holds door too early',
    category: 'now were both stressed',
  },
  {
    phrase: 'eating the last slice without asking anyone first',
    category: 'zero remorse',
  },
  {
    phrase: 'checking your bank account hoping for more money',
    category: 'maybe this time',
  },
  {
    phrase: 'eating gas stop sushi because youre feeling brave',
    category: 'terrible life choices',
  },
  {
    phrase: 'singing in the car at a red light proudly',
    category: 'free show for everyone',
  },
  {
    phrase: 'saving a pickle jar because it looks cool',
    category: 'things people collect',
  },
  {
    phrase: 'taking leftover dinner to work the next day',
    category: 'future me will want this',
  },
  {
    phrase: 'turning off the alarm and going back to bed',
    category: 'future me problem',
  },
  {
    phrase: 'eating cereal without milk because youre lazy',
    category: 'dry gang',
  },
  {
    phrase: 'putting ketchup on all your food even eggs',
    category: 'taste buds dont work',
  },
  {
    phrase: 'wearing shoes without socks in the summer',
    category: 'sweating the dogs',
  },
  {
    phrase: 'eating an whole family size bag of chips alone',
    category: 'i am the family',
  },
  {
    phrase: 'using duct tape to fix your entire car',
    category: 'saving a buck',
  },
  {
    phrase: 'only eating a sleeve of ritz and spray cheese',
    category: 'girl dinner',
  },
  {
    phrase: 'pushing pull doors and pulling push doors',
    category: 'bad designs',
  },
  {
    phrase: 'finishing a jar of nutella with only a spoon',
    category: 'living my best life',
  },
  {
    phrase: 'counting sheep but it does not work at all',
    category: "catching zzz's",
  },
  {
    phrase: 'buying a gym pass and never going even once',
    category: 'the lost dollar',
  },
  {
    phrase: 'eating ramen noodles for the fifth time this week',
    category: 'day in the life of a college student',
  },
  {
    phrase: 'coming home to a clean home after vacation',
    category: 'high upfront cost',
  },
  {
    phrase: 'testing the fridge light still works fine',
    category: 'does it actually turn off',
  },
  {
    phrase: 'eating cherry garcia right from the carton',
    category: 'spoon optional',
  },
  {
    phrase: 'saying almost there when you just left the house',
    category: "I swear I'm on my way",
  },
  {
    phrase: 'stopping to pet every single dog you see',
    category: 'the dog magnet',
  },
  {
    phrase: 'dipping french fries in a chocolate frosty',
    category: "don't knock it till you try it",
  },
  {
    phrase: 'buying stuff on sale you never wanted before',
    category: 'but look at the price',
  },
  {
    phrase: 'eating peanut butter with a spoon from the jar',
    category: "calories don't count at midnight",
  },
  {
    phrase: 'adding way too much cheese to every meal daily',
    category: 'cheese makes it better',
  },
  {
    phrase: 'wearing the same pants four days in a row',
    category: 'uniform of choice',
  },
  {
    phrase: 'eating an entire sleeve of crackers on autopilot',
    category: "didn't even notice",
  },
  {
    phrase: 'looking at your email at midnight for no reason',
    category: 'cant sleep anyway',
  },
  {
    phrase: 'putting pineapple on pizza and fighting about it',
    category: 'objectively better',
  },
  {
    phrase: 'reheating pizza in the microwave instead of oven',
    category: 'three minutes max',
  },
  {
    phrase: 'eating an entire box of thin mints with milk',
    category: 'supporting local troops right',
  },
  {
    phrase: 'leaving wet laundry in the washer for two days',
    category: 'smells like regret now',
  },
  {
    phrase: 'buying snacks at the gas station instead of the grocery store',
    category: 'paying the lazy tax',
  },
  {
    phrase: 'looking at your phone while watching tv shows',
    category: "I would've been an ipad kid",
  },
  {
    phrase: 'eating chips and salsa for dinner calling it a meal',
    category: 'vegetables are in there',
  },
  {
    phrase: 'having blue eyes and not being able to see on a sunny day',
    category: 'too bright in here',
  },
  {
    phrase: 'buying concert tickets you cant really afford',
    category: 'worth being broke for',
  },
  {
    phrase: 'eating cold pizza for breakfast straight from the box',
    category: 'breakfast of champions',
  },
  {
    phrase: 'sitting in your car for ten minutes after you arrive',
    category: 'not ready to go in yet',
  },
  {
    phrase: 'buying a plant and killing it within a month',
    category: 'plant serial killer',
  },
  {
    phrase: 'eating an entire costco chicken for the protein',
    category: 'gains start in the kitchen',
  },
  {
    phrase: 'ignoring the low tire pressure light for months',
    category: 'its just a suggestion',
  },
  {
    phrase: 'waiting to do laundry until you have no clothes left',
    category: 'strategic planning',
  },
  {
    phrase: 'eating taco bell and regretting it an hour later',
    category: 'you bite it, it bites back',
  },
  {
    phrase: 'buying a book you will never read at all',
    category: 'looks good on the shelf',
  },
  {
    phrase: 'heating the same coffee three times in a row',
    category: 'never the right temp',
  },
  {
    phrase: 'wearing a shirt inside out all day by accident',
    category: 'nobody said anything',
  },
  {
    phrase: 'eating cereal for every meal of the day today',
    category: 'cereal is versatile',
  },
  {
    phrase: 'buying a bulk pack at costco when youre just one person',
    category: 'better price per item',
  },
  {
    phrase: 'browsing reddit instead of doing your real work',
    category: 'just five more minutes',
  },
  {
    phrase: 'not realizing how many calories are in a pack of gummy bears',
    category: "there's how many in there?",
  },
  {
    phrase: 'stress cleaning your apartment 5 mins before guests arrive',
    category: 'i have to impress them',
  },
  {
    phrase: 'buying fast food after saying you would eat better',
    category: 'diet starts monday',
  },
  {
    phrase: 'wearing the same hoodie every day this week',
    category: 'comfort over fashion',
  },
  {
    phrase: 'ordering fast food right after grocery shopping',
    category: "i don't want to cook tonight",
  },
  {
    phrase: 'sending instagram reels to friends while on the toilet',
    category: 'bathroom scroll session',
  },
  {
    phrase: 'buying lotto tickets even though you wont win',
    category: 'someone has to win though',
  },
  {
    phrase: 'eating old food cold because the kitchen too far',
    category: 'peak laziness achieved',
  },
  {
    phrase: 'being up way too late binging youtube videos',
    category: 'just one more video',
  },
  {
    phrase: 'eating an entire bag of beef jerky on a road trip',
    category: 'protein packed journey',
  },
  {
    phrase: 'impulse buying things you saw in a social media ad',
    category: 'targeted ads work',
  },
  {
    phrase: 'wearing flip flops when its way too cold outside',
    category: 'toes are freezing but whatever',
  },
  {
    phrase: 'eating ranch sauce on basically all your food',
    category: 'ranch makes it better',
  },
  {
    phrase: 'your keys stay in the door all night by mistake',
    category: 'guardian angel working overtime',
  },
  {
    phrase: 'buying energy drinks at three in the early hours',
    category: 'sleep is for the weak',
  },
  {
    phrase: 'eating an entire package of cookie dough bites',
    category: 'theater snack at home',
  },
  {
    phrase: 'wearing your pjs to walmart on a lazy sunday',
    category: 'weekend dress code',
  },
  {
    phrase: 'browsing tiktok for three hours and losing track',
    category: 'time machine app',
  },
  {
    phrase: 'eating mcdonald fries that already got cold now',
    category: 'still pretty good honestly',
  },
  {
    phrase: 'getting a new phone case every other month',
    category: 'protecting my investment',
  },
  {
    phrase: 'wearing earbuds with dead battery to dodge people',
    category: 'social shield activated',
  },
  {
    phrase: 'eating grilled cheese with ketchup like a weirdo',
    category: 'dont judge my choices',
  },
  {
    phrase: 'your car stays running while you pop inside quick',
    category: 'just gonna be a second',
  },
  {
    phrase: 'someone stealing your running car and driving it away',
    category: "shouldn't have left it running, oops",
  },
  {
    phrase: 'buying girl scout cookies from every kid who asks',
    category: 'cant say no to thin mints',
  },
  {
    phrase: 'finishing an entire jar of queso with just chips',
    category: 'cheese dip for dinner',
  },
  {
    phrase: 'stalking your ex on social media late at night',
    category: 'bad idea but doing it anyway',
  },
  {
    phrase: 'wearing mismatched socks because the dryer eats them',
    category: 'close enough',
  },
  {
    phrase: 'eating hot pockets that are lava on one side only',
    category: 'ice cold in the middle',
  },
  {
    phrase: 'buying more stuff because free delivery over fifty',
    category: 'saving money by spending more',
  },
  {
    phrase: 'making spongebob mac and cheese for dinner',
    category: 'reliving the 2000s',
  },
  {
    phrase: 'getting an ad for a free product with 50 dollar shipping',
    category: 'classic bait and switch',
  },
  {
    phrase: 'rocking an iphone with no case and no apple care',
    category: 'living life on the edge',
  },
  {
    phrase: 'knowing you should put on sunscreen but not doing it',
    category: 'the uv index is only a suggestion',
  },

  {
    phrase: 'buying a house plant to prove you can keep things alive',
    category: 'it died in two weeks',
  },
  {
    phrase: 'turning on read notes just to mess with people',
    category: 'mind games',
  },
  {
    phrase: 'heating fish in the office microwave at lunchtime',
    category: 'making enemies efficiently',
  },
  {
    phrase: 'arguing that die hard is a holiday movie every year',
    category: 'this is the hill',
  },
  {
    phrase: 'wearing airpods during a chat to seem busy',
    category: 'social avoidance tool',
  },
  {
    phrase: 'buying a peloton that becomes a very pricey coat rack',
    category: 'four thousand dollar mistake',
  },
  {
    phrase: 'parking in your drive and blocking the sidewalk fully',
    category: 'neighbor complaint magnet',
  },
  {
    phrase: 'saying gif with a hard g just to start fights online',
    category: 'internet argument starter',
  },
  {
    phrase: 'keeping every box your gadgets came in forever',
    category: 'just in case i move',
  },
  {
    phrase: 'buying a smart fridge that tweets about expired milk',
    category: 'gadget nobody asked for',
  },
  {
    phrase: 'saying you read the terms fully before you agreed',
    category: 'lying to yourself',
  },
  {
    phrase: 'washing your car right before it rains heavily',
    category: 'murphy law in action',
  },
  {
    phrase: 'keeping twenty tabs open on your browser always',
    category: 'digital hoarder lifestyle',
  },
  {
    phrase: 'buying veggies to replace the already expired ones',
    category: "i swear i'll use them this time",
  },
  {
    phrase: 'getting a drunk tattoo and saying it has deep meaning',
    category: 'i thought it looked cool',
  },
  {
    phrase: 'leaving reusable bags in the car and buying more',
    category: 'the collection grows',
  },
  {
    phrase: 'buying a standing desk and never using it while upright',
    category: 'sitting with extra steps',
  },
  {
    phrase: 'keeping expired coupons in your wallet for years',
    category: 'maybe they will accept it',
  },
  {
    phrase: 'calling yourself an early bird but snoozing the alarm',
    category: 'self lies at its finest',
  },
  {
    phrase: 'buying a gym bag that never sees the inside of a gym',
    category: 'why do they call it that anyway',
  },
  {
    phrase: 'keeping every charging cable you have ever owned',
    category: 'drawer full of mystery cords',
  },
  {
    phrase: 'buying name brand pills when generic is the same',
    category: 'not trusting the generic brand',
  },
  {
    phrase: 'saying you will start meal prepping this sunday',
    category: 'narrator they did not',
  },
  {
    phrase: 'leaving your holiday lights up until march arrives',
    category: 'festive all year round',
  },
  {
    phrase: 'buying a book to seem smarter but never reading it',
    category: 'coffee table decoration',
  },
  {
    phrase: 'keeping hotel shampoo bottles you will never use',
    category: 'bathroom drawer hoarder',
  },
  {
    phrase: 'saying you are a morning person after one early day',
    category: 'delusion kicks in fast',
  },
  {
    phrase: 'buying a fancy coffee machine for regular coffee',
    category: 'pricey coffee maker',
  },
  {
    phrase: 'parking in a two hour zone and staying all day long',
    category: 'parking ticket collector',
  },
  {
    phrase: 'keeping receipts in your wallet from three years ago',
    category: 'might need to return this',
  },
  {
    phrase: 'buying running shoes with no plan of running ever',
    category: 'walking shoes now',
  },
  {
    phrase: 'saying you will learn guitar with that dusty one',
    category: 'bedroom decoration item',
  },
  {
    phrase: 'leaving voice messages unheard for literal months',
    category: 'if its urgent they will text',
  },
  {
    phrase: 'buying organic milk because the carton looks nicer',
    category: 'pretty grocery shopping',
  },
  {
    phrase: 'keeping sauce packets in your glove box forever',
    category: 'emergency condiment stash',
  },
  {
    phrase: 'saying you are going to delete social media soon',
    category: 'been saying that for years',
  },
  {
    phrase: 'buying a rice cooker to make only instant ramen',
    category: 'using it wrong on purpose',
  },
  {
    phrase: 'leaving your gas cap on the roof and driving away',
    category: 'twenty dollars down the drain',
  },
  {
    phrase: 'keeping old phones in a drawer with no purpose',
    category: 'tech graveyard pile',
  },
  {
    phrase: 'buying the newest iphone when yours works fine',
    category: 'apple got me again',
  },
  {
    phrase: 'saying you will sort your closet this weekend',
    category: 'said every weekend ever',
  },
  {
    phrase: 'leaving your rain cover at every cafe you visit',
    category: 'bought twelve this year',
  },
  {
    phrase: 'buying a blender for shakes you never make',
    category: 'loud dust collector',
  },
  {
    phrase: 'keeping cards from people you will never call',
    category: 'social theater show',
  },
  {
    phrase: 'saying you are too busy when you just watched netflix',
    category: 'time planning failure',
  },
  {
    phrase: 'buying a yoga mat that stays rolled up forever',
    category: 'good intentions graveyard',
  },
  {
    phrase: 'leaving your food at a diner every time',
    category: 'to go box graveyard',
  },
  {
    phrase: 'keeping old concert stubs in a box somewhere',
    category: 'memory hoarder confirmed',
  },
  {
    phrase: 'buying a fancy journal to write one entry in',
    category: 'blank page collection',
  },
  {
    phrase: 'saying you will wake up early tomorrow for sure',
    category: 'tomorrow never comes',
  },
  {
    phrase: 'leaving your cloth bags in the trunk for weeks',
    category: 'mobile storage unit now',
  },
  {
    phrase: 'buying a waffle maker you use twice a year',
    category: 'holiday morning special',
  },
  {
    phrase: 'keeping old papers you swear you will read',
    category: 'trash bin fodder',
  },
  {
    phrase: 'saying you are going to start waking up at five am',
    category: 'lasted exactly one day',
  },
  {
    phrase: 'buying a loud speaker way louder than you need',
    category: 'upsetting the neighbors',
  },
  {
    phrase: 'leaving your winter coat in the car all summer',
    category: 'trunk storage solution',
  },
  {
    phrase: 'keeping old gift cards with two dollars left on them',
    category: 'never going to use these',
  },
  {
    phrase: 'buying a salad spinner that takes up cabinet space',
    category: 'used it once maybe',
  },
  {
    phrase: 'saying you are going to start daily journal entries',
    category: 'lasted three whole days',
  },
  {
    phrase: 'keeping your gym pass active while never going',
    category: 'monthly guilt payment',
  },
  {
    phrase: 'buying a bread maker to make bread one single time',
    category: 'easier to just buy bread',
  },
  {
    phrase: 'keeping old birthday cards in a drawer forever',
    category: 'sentimental hoarder life',
  },
  {
    phrase: 'saying you are going to start eating better monday',
    category: 'monday never arrives somehow',
  },
  {
    phrase: 'buying a fancy knife set and using one knife only',
    category: 'block decoration piece',
  },
  {
    phrase: 'letting your cactus die despite being low care',
    category: 'killed the unkillable',
  },
  {
    phrase: 'keeping old loyalty punch cards that expired years ago',
    category: 'wallet space waster',
  },
  {
    phrase: 'buying a sous vide machine for chicken nuggets',
    category: 'culinary genius move',
  },
  {
    phrase: 'saying you will learn french on duolingo',
    category: 'three day streak record',
  },
  {
    phrase: 'leaving your bike chained outside until it rusts fully',
    category: 'outdoor lawn ornament',
  },
  {
    phrase: 'buying a fondue set used once at a dinner party',
    category: 'cabinet space occupied',
  },
  {
    phrase: 'keeping old movie ticket stubs in your wallet always',
    category: 'memory keeper syndrome',
  },
  {
    phrase: 'saying you will start going to bed early tonight',
    category: 'up browsing until three am',
  },
  {
    phrase: 'buying a slow cooker to make one pot of chili ever',
    category: 'countertop decorations',
  },
  {
    phrase: 'leaving your library books until they are overdue',
    category: 'late fee collector champion',
  },
  {
    phrase: 'keeping old cords that go to gadgets you dont own',
    category: 'mystery cable collection',
  },
  {
    phrase: 'buying a fancy camera to take blurry photos anyway',
    category: 'pricey desk weight bought',
  },
  {
    phrase: 'saying you will drink eight cups of water daily',
    category: 'coffee counts right',
  },
  {
    phrase: 'leaving your bike pump in the garage flat',
    category: 'ironic storage situation',
  },
  {
    phrase: 'buying a popcorn maker when bagged kind works fine',
    category: 'unneeded kitchen gadget',
  },
  {
    phrase: 'keeping old diner menus in your junk drawer',
    category: 'might order from there someday',
  },
  {
    phrase: 'saying you will stop dragging things off tomorrow',
    category: 'irony not lost here',
  },
  {
    phrase: 'buying a pizza stone you season once and forget',
    category: 'oven shelf now',
  },
  {
    phrase: 'leaving your water bottle in random places always',
    category: 'bought ten this year already',
  },
  {
    phrase: 'keeping old batteries that might still have juice',
    category: 'fire hazard drawer',
  },
  {
    phrase: 'buying a mandolin slicer to slice your fingers once',
    category: 'band aid budget increased',
  },
  {
    phrase: 'saying you are going to start using floss every night',
    category: 'dentist knows you are lying',
  },
  {
    phrase: 'leaving your coffee mug on your car roof and driving',
    category: 'replacement mug number twelve',
  },
  {
    phrase: 'buying a pasta maker for fresh pasta one time only',
    category: 'box pasta tastes fine',
  },
  {
    phrase: 'keeping old fortune cookie fortunes in your wallet',
    category: 'waiting for them to come true',
  },
  {
    phrase: 'saying you will start a daily mindful practice soon',
    category: 'got the app never opened',
  },
  {
    phrase: 'buying a soda stream to make soda water three times',
    category: 'fizzy regret purchase',
  },
  {
    phrase: 'leaving your rain cover in the stand at every place',
    category: 'donation program active',
  },
  {
    phrase: 'keeping old ink pens that dried out five years ago',
    category: 'might work again somehow',
  },
  {
    phrase: 'buying an air fryer to make frozen fries mostly',
    category: 'oven with extra steps',
  },
  {
    phrase: 'saying you will sort your photos soon enough',
    category: 'ten grand unsorted chaos',
  },
  {
    phrase: 'wearing your shades on top of your head indoors',
    category: 'where are my shades',
  },
  {
    phrase: 'keeping old birthday candles in the junk drawer',
    category: 'might need them someday',
  },
];
