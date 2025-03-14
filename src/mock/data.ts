import { Prisma } from '@prisma/client'
import { DayTimeline } from '../utils/schemas.js'

export const mockTimeline: DayTimeline = {
  'day': {
    'id': 'day_2uK5OSbDvAh7SOxpzwnzrZZzy66',
    'day': '2025-14-03',
    'description': 'Put the events in order of when they happened',
    'timelineId': 'timeline_2uK5OOpWJ9MVZnibXon3HLic21U',
    'createdAt': '2025-03-14T20:33:11.779Z',
    'updatedAt': '2025-03-14T20:33:11.779Z',
    'timeline': {
      'id': 'timeline_2uK5OOpWJ9MVZnibXon3HLic21U',
      'title': 'Events for 2025-14-03',
      'description': 'Put the events in order of when they happened',
      'solution': [
        'event_2tyJRHpOC0bUZuExCESsR4H9k1C',
        'event_2tyJW80ZngNUu9vPWc3Ib2uQVl9',
        'event_2tyJWJe76EPvCbbZOWcIDKqe5Hn',
        'event_2tyJWDgcTA3YZj0biUbn6OUlT3g',
        'event_2tyJWDe1eb2vO9TIrXEVImu0nhz',
        'event_2tyJRIEowfCGMxrzwtAuTFm9PEq',
      ],
      'events': [
        {
          'id': 'timelineevent_2uK5ONwk8FxhOQeadFGZ2fdETHW',
          'timelineId': 'timeline_2uK5OOpWJ9MVZnibXon3HLic21U',
          'eventId': 'event_2tyJRHpOC0bUZuExCESsR4H9k1C',
          'createdAt': '2025-03-14T20:33:11.779Z',
          'updatedAt': '2025-03-14T20:33:11.779Z',
          'event': {
            'id': 'event_2tyJRHpOC0bUZuExCESsR4H9k1C',
            'title': 'Hostess CupCakes are First Sold Commercially',
            'description':
              'The first commercially produced cupcakes in the US, recognized by their chocolate cake, cream filling, and distinctive white squiggle on top.',
            'subject': 'Hostess CupCakes',
            'imageUrl':
              'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxIb3N0ZXNzJTIwQ3VwQ2FrZXN8ZW58MHx8fHwxNzQxMzE4MzY5fDA&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
            'imageCreditName': 'Brooke Lark',
            'imageCreditUrl':
              'https://unsplash.com/@brookelark?utm_source=chronle&utm_medium=referral',
            'date': '1919-01-11T00:00:00.000Z',
            'createdAt': '2025-03-07T03:32:49.374Z',
            'updatedAt': '2025-03-07T03:32:49.374Z',
          },
        },
        {
          'id': 'timelineevent_2uK5OOGDABRKipOXZOskNfCWfjl',
          'timelineId': 'timeline_2uK5OOpWJ9MVZnibXon3HLic21U',
          'eventId': 'event_2tyJWDgcTA3YZj0biUbn6OUlT3g',
          'createdAt': '2025-03-14T20:33:11.779Z',
          'updatedAt': '2025-03-14T20:33:11.779Z',
          'event': {
            'id': 'event_2tyJWDgcTA3YZj0biUbn6OUlT3g',
            'title': 'Sour Patch Kids Candy is First Released',
            'description':
              "A soft candy coated in sour sugar with a sweet interior, shaped like small children and marketed with the tagline 'Sour. Sweet. Gone.'",
            'subject': 'Sour Patch Kids',
            'imageUrl':
              'https://images.unsplash.com/photo-1519340241574-2cec6aef0c01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxTb3VyJTIwUGF0Y2glMjBLaWRzfGVufDB8fHx8MTc0MTMxODQwOHww&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
            'imageCreditName': 'Steven Libralon',
            'imageCreditUrl': 'https://unsplash.com/@libs?utm_source=chronle&utm_medium=referral',
            'date': '1985-03-14T00:00:00.000Z',
            'createdAt': '2025-03-07T03:33:29.249Z',
            'updatedAt': '2025-03-07T03:33:29.249Z',
          },
        },
        {
          'id': 'timelineevent_2uK5OOLPzVKBvC8NTbh1EtWUqBR',
          'timelineId': 'timeline_2uK5OOpWJ9MVZnibXon3HLic21U',
          'eventId': 'event_2tyJWDe1eb2vO9TIrXEVImu0nhz',
          'createdAt': '2025-03-14T20:33:11.779Z',
          'updatedAt': '2025-03-14T20:33:11.779Z',
          'event': {
            'id': 'event_2tyJWDe1eb2vO9TIrXEVImu0nhz',
            'title': 'Red Bull Energy Drink is Launched',
            'description':
              "A carbonated energy drink containing caffeine, taurine, and B vitamins, marketed for its ability to 'give you wings.'",
            'subject': 'Red Bull',
            'imageUrl':
              'https://images.unsplash.com/photo-1617727553252-65863c156eb0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxSZWQlMjBCdWxsfGVufDB8fHx8MTc0MTMxODQwOHww&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
            'imageCreditName': 'Marcel Strauß',
            'imageCreditUrl':
              'https://unsplash.com/@martzzl?utm_source=chronle&utm_medium=referral',
            'date': '1987-04-01T00:00:00.000Z',
            'createdAt': '2025-03-07T03:33:29.304Z',
            'updatedAt': '2025-03-07T03:33:29.304Z',
          },
        },
        {
          'id': 'timelineevent_2uK5OOOKx4Ppx8DQUYYsSRHrGgG',
          'timelineId': 'timeline_2uK5OOpWJ9MVZnibXon3HLic21U',
          'eventId': 'event_2tyJWJe76EPvCbbZOWcIDKqe5Hn',
          'createdAt': '2025-03-14T20:33:11.779Z',
          'updatedAt': '2025-03-14T20:33:11.779Z',
          'event': {
            'id': 'event_2tyJWJe76EPvCbbZOWcIDKqe5Hn',
            'title': 'Cadbury Creme Egg is Introduced',
            'description':
              'A chocolate egg with a sweet fondant filling designed to mimic a real egg, particularly popular during Easter.',
            'subject': 'Cadbury Creme Egg',
            'imageUrl':
              'https://images.unsplash.com/photo-1607690424395-6660d838d818?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxDYWRidXJ5JTIwQ3JlbWUlMjBFZ2d8ZW58MHx8fHwxNzQxMzE4NDA4fDA&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
            'imageCreditName': 'Jasmin Egger',
            'imageCreditUrl':
              'https://unsplash.com/@vitya_photography?utm_source=chronle&utm_medium=referral',
            'date': '1963-04-15T00:00:00.000Z',
            'createdAt': '2025-03-07T03:33:29.189Z',
            'updatedAt': '2025-03-07T03:33:29.189Z',
          },
        },
        {
          'id': 'timelineevent_2uK5OQvk7bk3ECpCD38VGNnnnuz',
          'timelineId': 'timeline_2uK5OOpWJ9MVZnibXon3HLic21U',
          'eventId': 'event_2tyJW80ZngNUu9vPWc3Ib2uQVl9',
          'createdAt': '2025-03-14T20:33:11.779Z',
          'updatedAt': '2025-03-14T20:33:11.779Z',
          'event': {
            'id': 'event_2tyJW80ZngNUu9vPWc3Ib2uQVl9',
            'title': 'Cheetos are Introduced by Frito-Lay',
            'description':
              'A cheese-flavored, puffed cornmeal snack that would become known for its distinctive orange color and crunchy texture.',
            'subject': 'Cheetos',
            'imageUrl':
              'https://images.unsplash.com/photo-1581533940608-d2973792f542?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxDaGVldG9zfGVufDB8fHx8MTc0MTMxODQwOHww&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
            'imageCreditName': 'Giorgio Trovato',
            'imageCreditUrl':
              'https://unsplash.com/@giorgiotrovato?utm_source=chronle&utm_medium=referral',
            'date': '1948-05-13T00:00:00.000Z',
            'createdAt': '2025-03-07T03:33:28.687Z',
            'updatedAt': '2025-03-07T03:33:28.687Z',
          },
        },
        {
          'id': 'timelineevent_2uK5ORrtu3Q3msbczXy8EXQsNfP',
          'timelineId': 'timeline_2uK5OOpWJ9MVZnibXon3HLic21U',
          'eventId': 'event_2tyJRIEowfCGMxrzwtAuTFm9PEq',
          'createdAt': '2025-03-14T20:33:11.779Z',
          'updatedAt': '2025-03-14T20:33:11.779Z',
          'event': {
            'id': 'event_2tyJRIEowfCGMxrzwtAuTFm9PEq',
            'title': 'SunChips Multigrain Snacks are Introduced by Frito-Lay',
            'description':
              'A brand of wavy, rippled multigrain chips that were marketed as a healthier alternative to regular potato chips.',
            'subject': 'SunChips',
            'imageUrl':
              'https://images.unsplash.com/photo-1600209142000-aa256622e64a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxTdW5DaGlwcyUyME11bHRpZ3JhaW4lMjBTbmFja3MlMjBhcmUlMjBJbnRyb2R1Y2VkJTIwYnklMjBGcml0by1MYXl8ZW58MHx8fHwxNzQxMzE4MzY5fDA&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
            'imageCreditName': 'Nate Johnston',
            'imageCreditUrl':
              'https://unsplash.com/@natejohnston?utm_source=chronle&utm_medium=referral',
            'date': '1991-05-13T00:00:00.000Z',
            'createdAt': '2025-03-07T03:32:49.488Z',
            'updatedAt': '2025-03-07T03:32:49.488Z',
          },
        },
      ],
    },
  },
}
