import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedCard {
  term: string;
  definition: string;
  example: string;
  translation: string;
}

interface SeedLesson {
  title: string;
  description: string;
  level: string;
  cards: SeedCard[];
}

interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  lessons: SeedLesson[];
}

const seed: SeedCategory[] = [
  {
    slug: 'devops',
    name: 'DevOps',
    description: 'CI/CD, containers, infrastructure and operational vocabulary.',
    iconKey: 'devops',
    lessons: [
      {
        title: 'Containers & CI/CD essentials',
        description: 'Vocabulary you will hear daily in stand-ups and on-call rotations.',
        level: 'B1',
        cards: [
          {
            term: 'pipeline',
            definition: 'An automated sequence of steps that builds, tests and deploys code.',
            example: 'The CI pipeline failed on the integration test stage.',
            translation: 'canalización',
          },
          {
            term: 'rollout',
            definition: 'The act of releasing a new version to an environment.',
            example: 'We scheduled the rollout for Friday afternoon.',
            translation: 'despliegue',
          },
          {
            term: 'rollback',
            definition: 'Reverting to a previous working version after a failed release.',
            example: 'High error rate triggered an automatic rollback.',
            translation: 'reversión',
          },
        ],
      },
    ],
  },
  {
    slug: 'frontend',
    name: 'Frontend',
    description: 'Browser, accessibility and component vocabulary.',
    iconKey: 'frontend',
    lessons: [
      {
        title: 'Modern web UI vocabulary',
        description: 'Words for design hand-offs, accessibility and component APIs.',
        level: 'B1',
        cards: [
          {
            term: 'accessibility',
            definition: 'Designing and coding so the product is usable by everyone.',
            example: 'Accessibility is not an afterthought, it ships in the sprint.',
            translation: 'accesibilidad',
          },
          {
            term: 'hydration',
            definition: 'Attaching event listeners to server-rendered HTML on the client.',
            example: 'Hydration mismatch caused the modal to flicker.',
            translation: 'hidratación',
          },
          {
            term: 'lazy loading',
            definition: 'Deferring the loading of resources until they are needed.',
            example: 'We use lazy loading for below-the-fold images.',
            translation: 'carga diferida',
          },
        ],
      },
    ],
  },
  {
    slug: 'backend',
    name: 'Backend',
    description: 'APIs, databases, concurrency and reliability.',
    iconKey: 'backend',
    lessons: [
      {
        title: 'API design & data integrity',
        description: 'Vocabulary for talking about contracts, transactions and consistency.',
        level: 'B2',
        cards: [
          {
            term: 'idempotent',
            definition: 'An operation that produces the same result no matter how many times it runs.',
            example: 'Make sure the webhook handler is idempotent.',
            translation: 'idempotente',
          },
          {
            term: 'backpressure',
            definition: 'Mechanism for a consumer to signal that it cannot keep up with the producer.',
            example: 'Apply backpressure when the queue grows past the threshold.',
            translation: 'contrapresión',
          },
          {
            term: 'transaction',
            definition: 'A unit of work that either completes fully or has no effect at all.',
            example: 'Wrap the debit and credit in a single transaction.',
            translation: 'transacción',
          },
        ],
      },
    ],
  },
  {
    slug: 'cloud',
    name: 'Cloud',
    description: 'Scalability, managed services and operational vocabulary.',
    iconKey: 'cloud',
    lessons: [
      {
        title: 'Scalability & managed services',
        description: 'Words used in architecture reviews and capacity planning.',
        level: 'B2',
        cards: [
          {
            term: 'autoscaling',
            definition: 'Automatically adjusting compute capacity to match load.',
            example: 'Autoscaling kicked in when CPU crossed 70%.',
            translation: 'autoescalado',
          },
          {
            term: 'cold start',
            definition: 'Latency added when a serverless function starts on demand.',
            example: 'Cold starts are visible on the p99 latency.',
            translation: 'arranque en frío',
          },
          {
            term: 'multi-region',
            definition: 'Deploying the same workload to several geographic regions.',
            example: 'We are moving the API tier to multi-region.',
            translation: 'multirregión',
          },
        ],
      },
    ],
  },
];

async function main(): Promise<void> {
  for (const cat of seed) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        iconKey: cat.iconKey,
      },
      update: {
        name: cat.name,
        description: cat.description,
        iconKey: cat.iconKey,
      },
    });
    for (const lesson of cat.lessons) {
      const existing = await prisma.lesson.findFirst({
        where: { title: lesson.title, categoryId: category.id },
      });
      const lessonRow = existing
        ? await prisma.lesson.update({
            where: { id: existing.id },
            data: {
              description: lesson.description,
              level: lesson.level,
              categoryId: category.id,
            },
          })
        : await prisma.lesson.create({
            data: {
              title: lesson.title,
              description: lesson.description,
              level: lesson.level,
              categoryId: category.id,
            },
          });
      let ordinal = 0;
      for (const card of lesson.cards) {
        await prisma.vocabularyCard.upsert({
          where: { lessonId_ordinal: { lessonId: lessonRow.id, ordinal } },
          create: {
            lessonId: lessonRow.id,
            ordinal,
            term: card.term,
            definition: card.definition,
            example: card.example,
            translation: card.translation,
            level: lesson.level,
          },
          update: {
            term: card.term,
            definition: card.definition,
            example: card.example,
            translation: card.translation,
            level: lesson.level,
          },
        });
        ordinal += 1;
      }
    }
  }
  const counts = await Promise.all([
    prisma.category.count(),
    prisma.lesson.count(),
    prisma.vocabularyCard.count(),
  ]);
  console.log(
    `seed: ok (categories=${counts[0]}, lessons=${counts[1]}, cards=${counts[2]})`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
