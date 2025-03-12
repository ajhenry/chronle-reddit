import { Prisma } from '@prisma/client';

export const mockTimeline = {
  'id': 'day_2uCBdEWwwDArRFCpK4pbOw8S9z3',
  'day': '2025-03-12',
  'description': 'Put the events in order of when they happened',
  'timelineId': 'timeline_2uCBdELztAVLMRM7U6njarzZa9s',
  'createdAt': '2025-03-12T01:26:00.182Z',
  'updatedAt': '2025-03-12T01:26:00.182Z',
  'timeline': {
    'id': 'timeline_2uCBdELztAVLMRM7U6njarzZa9s',
    'title': 'Events for 2025-03-12',
    'description': 'Put the events in order of when they happened',
    'solution': [
      'event-2-id',
      'event-5-id',
      'event_2tuKaJE3qz78XqdjvV1HIC9pV5E',
      'event_2tuKaKHmnrOL2UwSu7tljpBmpKc',
      'event_2tuKaKfUKfHfk5RpHEj3Sj4s8fF',
      'event_2tuKaJNdERqclbIuwGuRgrPMBzV',
    ],
    'events': [
      {
        'id': 'timelineevent_2uCBd8QnLLz75CRXHNCSenb6KVz',
        'timelineId': 'timeline_2uCBdELztAVLMRM7U6njarzZa9s',
        'eventId': 'event_2tuKaKfUKfHfk5RpHEj3Sj4s8fF',
        'createdAt': '2025-03-12T01:26:00.182Z',
        'updatedAt': '2025-03-12T01:26:00.182Z',
        'event': {
          'id': 'event_2tuKaKfUKfHfk5RpHEj3Sj4s8fF',
          'title': 'Pringles Potato Chips are First Manufactured',
          'description':
            'A unique potato chip with a distinctive curved shape and packaged in a tall cylindrical container, revolutionizing the potato chip packaging industry.',
          'subject': 'Pringles',
          'imageUrl':
            'https://images.unsplash.com/photo-1599493356626-9fdbdabfd9bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxQcmluZ2xlc3xlbnwwfHx8fDE3NDExNTQ4MTR8MA&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
          'imageCreditName': 'Arnold Antoo',
          'imageCreditUrl':
            'https://unsplash.com/@arnold_antoo?utm_source=chronle&utm_medium=referral',
          'date': '1968-01-05T00:00:00.000Z',
          'createdAt': '2025-03-05T17:43:01.394Z',
          'updatedAt': '2025-03-05T17:43:01.394Z',
        },
      },
      {
        'id': 'timelineevent_2uCBdAvty9oCpQfOxHXIWxVPsWp',
        'timelineId': 'timeline_2uCBdELztAVLMRM7U6njarzZa9s',
        'eventId': 'event-2-id',
        'createdAt': '2025-03-12T01:26:00.182Z',
        'updatedAt': '2025-03-12T01:26:00.182Z',
        'event': {
          'id': 'event-2-id',
          'title': 'Declaration of Independence',
          'description':
            "The Continental Congress adopts the Declaration of Independence, announcing the thirteen American colonies' independence from Great Britain.",
          'subject': 'Continental Congress',
          'imageUrl':
            'https://images.unsplash.com/photo-1580129924992-02eaa9a5509b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxDb250aW5lbnRhbCUyMENvbmdyZXNzfGVufDB8fHx8MTc0MTE1NzUxMXww&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
          'imageCreditName': 'Library of Congress',
          'imageCreditUrl':
            'https://unsplash.com/@libraryofcongress?utm_source=chronle&utm_medium=referral',
          'date': '1776-07-04T00:00:00.000Z',
          'createdAt': '2025-03-05T17:43:01.074Z',
          'updatedAt': '2025-03-05T17:43:01.074Z',
        },
      },
      {
        'id': 'timelineevent_2uCBdEOlkGSIEBKtmBWPdDYp8nU',
        'timelineId': 'timeline_2uCBdELztAVLMRM7U6njarzZa9s',
        'eventId': 'event_2tuKaJNdERqclbIuwGuRgrPMBzV',
        'createdAt': '2025-03-12T01:26:00.182Z',
        'updatedAt': '2025-03-12T01:26:00.182Z',
        'event': {
          'id': 'event_2tuKaJNdERqclbIuwGuRgrPMBzV',
          'title': 'Microwave Popcorn Bags are Invented',
          'description':
            'A convenient way to make popcorn at home using a microwave, transforming how people prepare this popular snack.',
          'subject': 'Microwave Popcorn',
          'imageUrl':
            'https://images.unsplash.com/photo-1608384156808-418b5c079968?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxNaWNyb3dhdmUlMjBQb3Bjb3JufGVufDB8fHx8MTc0MTE1NDgxNHww&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
          'imageCreditName': 'Vlad Zaytsev',
          'imageCreditUrl': 'https://unsplash.com/@vladizlo?utm_source=chronle&utm_medium=referral',
          'date': '1981-06-01T00:00:00.000Z',
          'createdAt': '2025-03-05T17:43:01.410Z',
          'updatedAt': '2025-03-05T17:43:01.410Z',
        },
      },
      {
        'id': 'timelineevent_2uCBdEWPtS1gkJX29JuVkZ0F7xk',
        'timelineId': 'timeline_2uCBdELztAVLMRM7U6njarzZa9s',
        'eventId': 'event_2tuKaKHmnrOL2UwSu7tljpBmpKc',
        'createdAt': '2025-03-12T01:26:00.182Z',
        'updatedAt': '2025-03-12T01:26:00.182Z',
        'event': {
          'id': 'event_2tuKaKHmnrOL2UwSu7tljpBmpKc',
          'title': 'Gatorade is Invented by University of Florida Scientists',
          'description':
            'A sports drink developed to help athletes replace electrolytes and maintain hydration during intense physical activity.',
          'subject': 'Gatorade',
          'imageUrl':
            'https://images.unsplash.com/photo-1482685427746-4e6cffe9671a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxHYXRvcmFkZXxlbnwwfHx8fDE3NDExNTQ4MTR8MA&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
          'imageCreditName': 'Emma Dau',
          'imageCreditUrl': 'https://unsplash.com/@daugirl?utm_source=chronle&utm_medium=referral',
          'date': '1965-09-01T00:00:00.000Z',
          'createdAt': '2025-03-05T17:43:01.390Z',
          'updatedAt': '2025-03-05T17:43:01.390Z',
        },
      },
      {
        'id': 'timelineevent_2uCBdF5Op4mgbv8fpW0hlKD3sgs',
        'timelineId': 'timeline_2uCBdELztAVLMRM7U6njarzZa9s',
        'eventId': 'event_2tuKaJE3qz78XqdjvV1HIC9pV5E',
        'createdAt': '2025-03-12T01:26:00.182Z',
        'updatedAt': '2025-03-12T01:26:00.182Z',
        'event': {
          'id': 'event_2tuKaJE3qz78XqdjvV1HIC9pV5E',
          'title': 'Oreo Cookies are First Produced',
          'description':
            "A chocolate sandwich cookie with a sweet cream filling, which would become one of the world's most popular cookies.",
          'subject': 'Oreo',
          'imageUrl':
            'https://images.unsplash.com/photo-1620416162788-932341950162?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxPcmVvfGVufDB8fHx8MTc0MTE1NDgxNHww&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
          'imageCreditName': 'Israel Albornoz',
          'imageCreditUrl':
            'https://unsplash.com/@israelalbornoz?utm_source=chronle&utm_medium=referral',
          'date': '1912-03-14T00:00:00.000Z',
          'createdAt': '2025-03-05T17:43:01.373Z',
          'updatedAt': '2025-03-05T17:43:01.373Z',
        },
      },
      {
        'id': 'timelineevent_2uCBdFn5csCefLP0DhxcCuhMb3f',
        'timelineId': 'timeline_2uCBdELztAVLMRM7U6njarzZa9s',
        'eventId': 'event-5-id',
        'createdAt': '2025-03-12T01:26:00.182Z',
        'updatedAt': '2025-03-12T01:26:00.182Z',
        'event': {
          'id': 'event-5-id',
          'title': 'First Computer Program',
          'description':
            "Ada Lovelace publishes the first computer program, making her the world's first computer programmer. She wrote an algorithm for Charles Babbage's proposed mechanical general-purpose computer, the Analytical Engine.",
          'subject': 'Ada Lovelace',
          'imageUrl':
            'https://images.unsplash.com/photo-1736778958575-e261c89dad7b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w2MjM1MjB8MHwxfHNlYXJjaHwyfHxBZGElMjBMb3ZlbGFjZXxlbnwwfHx8fDE3NDExOTY1ODB8MA&ixlib=rb-4.0.3&q=80&w=400?utm_source=chronle&utm_medium=referral',
          'imageCreditName': 'Oswald Elsaboath',
          'imageCreditUrl':
            'https://unsplash.com/@ozzzyphotos?utm_source=chronle&utm_medium=referral',
          'date': '1843-10-18T00:00:00.000Z',
          'createdAt': '2025-03-05T17:43:01.153Z',
          'updatedAt': '2025-03-05T17:43:01.153Z',
        },
      },
    ],
  },
} as unknown as Prisma.TimelineGetPayload<{
  include: {
    events: {
      include: {
        event: true;
      };
    };
  };
}>;
