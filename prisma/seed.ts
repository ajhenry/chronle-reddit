import { getImageFromTopic } from "@/lib/unsplash";
import { createEvents } from "@/server/router";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Upsert a user
  const user = await prisma.user.upsert({
    where: { id: "jonny-appleseed-id" },
    update: {},
    create: {
      id: "jonny-appleseed-id",
      handle: "jonny_appleseed",
      fullName: "Jonny Appleseed",
      avatarUrl: "https://example.com/avatar.png",
      billingAddress: {},
      paymentMethod: {},
      email: "jonny.appleseed@example.com",
    },
  });

  // Upsert categories
  const categories = await Promise.all(
    ["Category 1", "Category 2", "Category 3"].map((title, index) =>
      prisma.category.upsert({
        where: { id: `category-${index + 1}-id` },
        update: {},
        create: {
          id: `category-${index + 1}-id`,
          title,
          description: `${title} description`,
        },
      })
    )
  );

  // Upsert events
  const events = [];
  const historicalEvents = [
    {
      id: "event-1-id",
      title: "First Moon Landing",
      description:
        "Apollo 11 astronauts Neil Armstrong and Buzz Aldrin become the first humans to land on the Moon. Armstrong famously says 'That's one small step for man, one giant leap for mankind' as he steps onto the lunar surface.",
      subject: "Apollo 11",
      date: new Date("1969-07-20"),
      imageUrl: "https://example.com/moon-landing.png",
      imageCreditName: "NASA",
      imageCreditUrl: "https://www.nasa.gov",
    },
    {
      id: "event-2-id",
      title: "Declaration of Independence",
      description:
        "The Continental Congress adopts the Declaration of Independence, announcing the thirteen American colonies' independence from Great Britain.",
      subject: "Continental Congress",
      date: new Date("1776-07-04"),
      imageUrl: "https://example.com/declaration.png",
      imageCreditName: "National Archives",
      imageCreditUrl: "https://www.archives.gov",
    },
    {
      id: "event-3-id",
      title: "World Wide Web Launch",
      description:
        "Tim Berners-Lee releases the first web browser and server software, marking the beginning of the World Wide Web as a publicly available service on the Internet.",
      subject: "Tim Berners-Lee",
      date: new Date("1991-08-06"),
      imageUrl: "https://example.com/www.png",
      imageCreditName: "CERN",
      imageCreditUrl: "https://home.cern",
    },
    {
      id: "event-4-id",
      title: "Fall of the Berlin Wall",
      description:
        "The Berlin Wall, which had divided East and West Berlin since 1961, is opened, allowing citizens to freely cross between the two sides for the first time in 28 years.",
      subject: "Berlin Wall",
      date: new Date("1989-11-09"),
      imageUrl: "https://example.com/berlin-wall.png",
      imageCreditName: "Associated Press",
      imageCreditUrl: "https://ap.org",
    },
    {
      id: "event-5-id",
      title: "First Computer Program",
      description:
        "Ada Lovelace publishes the first computer program, making her the world's first computer programmer. She wrote an algorithm for Charles Babbage's proposed mechanical general-purpose computer, the Analytical Engine.",
      subject: "Ada Lovelace",
      date: new Date("1843-10-18"),
      imageUrl: "https://example.com/ada-lovelace.png",
      imageCreditName: "Science Museum",
      imageCreditUrl: "https://www.sciencemuseum.org.uk",
    },
    {
      id: "event-6-id",
      title: "First Flight",
      description:
        "The Wright brothers make the first controlled, sustained flight of a powered, heavier-than-air aircraft with the Wright Flyer at Kitty Hawk, North Carolina.",
      subject: "Wright Brothers",
      date: new Date("1903-12-17"),
      imageUrl: "https://example.com/wright-brothers.png",
      imageCreditName: "Library of Congress",
      imageCreditUrl: "https://www.loc.gov",
    },
    {
      id: "event-7-id",
      title: "First DNA Structure Discovery",
      description:
        "James Watson and Francis Crick publish their discovery of the double helix structure of DNA, one of the most important scientific discoveries of the 20th century.",
      subject: "Watson and Crick",
      date: new Date("1953-04-25"),
      imageUrl: "https://example.com/dna.png",
      imageCreditName: "Nature",
      imageCreditUrl: "https://www.nature.com",
    },
  ];

  // Find images for the events from unsplash
  const unsplashImages = await Promise.all(
    historicalEvents.map((event) => getImageFromTopic(event.subject))
  );

  // Add the images to the events
  historicalEvents.forEach((event, index) => {
    event.imageUrl = unsplashImages[index]!.url;
    event.imageCreditName = unsplashImages[index]!.name;
    event.imageCreditUrl = unsplashImages[index]!.unsplashProfile;
  });

  for (const eventData of historicalEvents) {
    const event = await prisma.event.upsert({
      where: { id: eventData.id },
      update: {},
      create: eventData,
    });
    events.push(event);
  }

  // Upsert a timeline
  const timeline = await prisma.timeline.upsert({
    where: { id: "timeline-id" },
    update: {},
    create: {
      id: "timeline-id",
      title: "Timeline",
      description: "Description for timeline",
      solution: historicalEvents
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((event) => event.id),
      events: {
        create: historicalEvents
          .sort(() => Math.random() - 0.5)
          .map((event) => ({
            eventId: event.id,
          })),
      },
    },
  });

  // Upsert a day for today
  await prisma.day.upsert({
    where: { id: "today-id" },
    update: {},
    create: {
      id: "today-id",
      day: new Date().toISOString().split("T")[0],
      description: "Description for today",
      timelineId: timeline.id,
    },
  });

  // Upload these events :)
  const realEvents = {
    events: [
      {
        name: "Pringles Potato Chips are First Manufactured",
        description:
          "A unique potato chip with a distinctive curved shape and packaged in a tall cylindrical container, revolutionizing the potato chip packaging industry.",
        subject: "Pringles",
        date: "1968-01-05",
        categories: [
          {
            title: "Chips",
            description:
              "Thin, crispy slices of potato or other vegetables, typically seasoned and fried.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Häagen-Dazs Ice Cream Company is Founded",
        description:
          "A premium ice cream brand created by two entrepreneurs who wanted to make the finest ice cream in the United States.",
        subject: "Häagen-Dazs",
        date: "1961-11-15",
        categories: [
          {
            title: "Ice Cream",
            description:
              "A frozen dessert made from dairy products and often flavored with various ingredients.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Gatorade is Invented by University of Florida Scientists",
        description:
          "A sports drink developed to help athletes replace electrolytes and maintain hydration during intense physical activity.",
        subject: "Gatorade",
        date: "1965-09-01",
        categories: [
          {
            title: "Drink",
            description:
              "A liquid meant to be consumed for hydration or enjoyment.",
          },
          {
            title: "Soda",
            description: "A carbonated or non-carbonated flavored beverage.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Pop Rocks Candy is First Sold",
        description:
          "A unique candy that creates a popping and crackling sensation in the mouth due to pressurized carbon dioxide bubbles.",
        subject: "Pop Rocks",
        date: "1975-07-01",
        categories: [
          {
            title: "Candy",
            description:
              "A sweet treat typically made from sugar or other sweeteners.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Oreo Cookies are First Produced",
        description:
          "A chocolate sandwich cookie with a sweet cream filling, which would become one of the world's most popular cookies.",
        subject: "Oreo",
        date: "1912-03-14",
        categories: [
          {
            title: "Cookies",
            description: "A sweet baked treat, often flat and round.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Microwave Popcorn Bags are Invented",
        description:
          "A convenient way to make popcorn at home using a microwave, transforming how people prepare this popular snack.",
        subject: "Microwave Popcorn",
        date: "1981-06-01",
        categories: [
          {
            title: "Popcorn",
            description: "A light, puffy snack made from heated corn kernels.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Chewing Gum is First Mass-Produced in the United States",
        description:
          "The first commercial production of chewing gum begins, marking the start of a new type of snack and oral entertainment.",
        subject: "Chewing Gum",
        date: "1871-12-28",
        categories: [
          {
            title: "Gum",
            description:
              "A chewy substance meant to be repeatedly chewed but not swallowed.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Doritos Corn Chips are First Introduced",
        description:
          "A triangular-shaped corn chip that would become a globally recognized snack food, initially created and sold by Frito-Lay.",
        subject: "Doritos",
        date: "1966-03-01",
        categories: [
          {
            title: "Chips",
            description:
              "Thin, crispy slices of corn or potato, typically seasoned and fried.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Mars Bar is First Created",
        description:
          "A chocolate bar made of nougat and caramel, covered in milk chocolate, that would become a popular worldwide confection.",
        subject: "Mars Bar",
        date: "1932-09-01",
        categories: [
          {
            title: "Candy",
            description:
              "A sweet treat typically made from sugar or other sweeteners.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
      {
        name: "Ben & Jerry's Ice Cream Company is Founded",
        description:
          "A premium ice cream company known for unique and creative flavors, started by two friends in Vermont.",
        subject: "Ben & Jerry's",
        date: "1978-05-05",
        categories: [
          {
            title: "Ice Cream",
            description:
              "A frozen dessert made from dairy products and often flavored with various ingredients.",
          },
          {
            title: "Food",
            description:
              "Something you eat to provide nutrition and enjoyment.",
          },
          {
            title: "Snack",
            description: "A quick bite between meals that satisfies hunger.",
          },
        ],
      },
    ],
  };

  const results = await createEvents(realEvents);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
