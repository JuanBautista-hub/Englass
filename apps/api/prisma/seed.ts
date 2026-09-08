import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

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
  order: number;
  lessons: SeedLesson[];
}

const seed: SeedCategory[] = [
  {
    slug: 'pronunciation',
    name: 'Pronunciación',
    description: 'Las vocales y consonantes básicas. Tu primer paso para sonar natural.',
    iconKey: 'pronunciation',
    order: 1,
    lessons: [
      {
        title: 'Las vocales',
        description: 'Cinco sonidos que forman casi todas las palabras en inglés.',
        level: 'A1',
        cards: [
          { term: 'a', definition: 'Primera vocal. Se pronuncia /æ/ o /eɪ/ según la palabra.', example: 'apple, cat, name', translation: 'a' },
          { term: 'e', definition: 'Segunda vocal. Se pronuncia /ɛ/ o /i/ según la palabra.', example: 'elephant, me, he', translation: 'e' },
          { term: 'i', definition: 'Tercera vocal. Se pronuncia /ɪ/ o /aɪ/ según la palabra.', example: 'igloo, bike, fish', translation: 'i' },
          { term: 'o', definition: 'Cuarta vocal. Se pronuncia /ɒ/, /oʊ/ o /ʌ/ según la palabra.', example: 'octopus, go, son', translation: 'o' },
          { term: 'u', definition: 'Quinta vocal. Se pronuncia /ʌ/ o /u/ según la palabra.', example: 'umbrella, blue, cup', translation: 'u' },
        ],
      },
      {
        title: 'Consonantes básicas',
        description: 'Sonidos consonánticos que más vas a escuchar al empezar.',
        level: 'A1',
        cards: [
          { term: 'b', definition: 'Sonido /b/ como en "box".', example: 'book, boy, blue', translation: 'be' },
          { term: 'p', definition: 'Sonido /p/ como en "pen".', example: 'pen, people, play', translation: 'pe' },
          { term: 't', definition: 'Sonido /t/ como en "tea".', example: 'tea, time, today', translation: 'te' },
          { term: 'd', definition: 'Sonido /d/ como en "dog".', example: 'dog, day, did', translation: 'de' },
          { term: 'm', definition: 'Sonido /m/ como en "moon".', example: 'moon, morning, me', translation: 'eme' },
          { term: 'n', definition: 'Sonido /n/ como en "no".', example: 'no, name, nine', translation: 'ene' },
        ],
      },
    ],
  },
  {
    slug: 'numbers',
    name: 'Números',
    description: 'Contar, decir precios, fechas y teléfonos.',
    iconKey: 'numbers',
    order: 2,
    lessons: [
      {
        title: 'Del 1 al 10',
        description: 'Los números que usarás todos los días.',
        level: 'A1',
        cards: [
          { term: 'one', definition: 'El número 1.', example: 'I have one brother.', translation: 'uno' },
          { term: 'two', definition: 'El número 2.', example: 'Two cups of coffee, please.', translation: 'dos' },
          { term: 'three', definition: 'El número 3.', example: 'Three minutes left.', translation: 'tres' },
          { term: 'four', definition: 'El número 4.', example: 'Open to page four.', translation: 'cuatro' },
          { term: 'five', definition: 'El número 5.', example: 'The meeting is at five.', translation: 'cinco' },
          { term: 'six', definition: 'El número 6.', example: 'Six people came.', translation: 'seis' },
          { term: 'seven', definition: 'El número 7.', example: 'I work until seven.', translation: 'siete' },
          { term: 'eight', definition: 'El número 8.', example: 'Eight o\'clock.', translation: 'ocho' },
          { term: 'nine', definition: 'El número 9.', example: 'Nine to five job.', translation: 'nueve' },
          { term: 'ten', definition: 'El número 10.', example: 'Give me ten minutes.', translation: 'diez' },
        ],
      },
      {
        title: 'Decenas y centenas',
        description: 'Para precios, años y cantidades grandes.',
        level: 'A2',
        cards: [
          { term: 'twenty', definition: 'El número 20.', example: 'Twenty dollars.', translation: 'veinte' },
          { term: 'fifty', definition: 'El número 50.', example: 'Fifty percent off.', translation: 'cincuenta' },
          { term: 'hundred', definition: 'El número 100.', example: 'A hundred times.', translation: 'cien' },
          { term: 'thousand', definition: 'El número 1 000.', example: 'Two thousand users.', translation: 'mil' },
          { term: 'million', definition: 'El número 1 000 000.', example: 'A million requests.', translation: 'millón' },
        ],
      },
    ],
  },
  {
    slug: 'countries',
    name: 'Países y nacionalidades',
    description: 'De dónde eres y dónde vives.',
    iconKey: 'countries',
    order: 3,
    lessons: [
      {
        title: 'América Latina',
        description: 'Países y gentilicios de la región.',
        level: 'A1',
        cards: [
          { term: 'Mexico', definition: 'País de América del Norte.', example: 'I am from Mexico.', translation: 'México' },
          { term: 'Mexican', definition: 'Persona de México.', example: 'She is Mexican.', translation: 'mexicano/a' },
          { term: 'Argentina', definition: 'País de Sudamérica.', example: 'Buenos Aires, Argentina.', translation: 'Argentina' },
          { term: 'Argentine', definition: 'Persona de Argentina.', example: 'He is Argentine.', translation: 'argentino/a' },
          { term: 'Colombia', definition: 'País de Sudamérica.', example: 'I travel to Colombia next week.', translation: 'Colombia' },
          { term: 'Colombian', definition: 'Persona de Colombia.', example: 'Colombian coffee is famous.', translation: 'colombiano/a' },
          { term: 'Chile', definition: 'País largo y angosto de Sudamérica.', example: 'Santiago, Chile.', translation: 'Chile' },
          { term: 'Chilean', definition: 'Persona de Chile.', example: 'Chilean wine.', translation: 'chileno/a' },
        ],
      },
      {
        title: 'El resto del mundo',
        description: 'Países y gentilicios comunes fuera de Latinoamérica.',
        level: 'A2',
        cards: [
          { term: 'Spain', definition: 'País de Europa.', example: 'I live in Spain.', translation: 'España' },
          { term: 'Spanish', definition: 'De España; también el idioma.', example: 'I speak Spanish.', translation: 'español/a' },
          { term: 'the United States', definition: 'País de América del Norte.', example: 'I work in the United States.', translation: 'Estados Unidos' },
          { term: 'American', definition: 'Persona de los Estados Unidos.', example: 'She is American.', translation: 'estadounidense' },
          { term: 'France', definition: 'País de Europa.', example: 'Paris, France.', translation: 'Francia' },
          { term: 'French', definition: 'De Francia; también el idioma.', example: 'French bread.', translation: 'francés/a' },
          { term: 'Japan', definition: 'País de Asia.', example: 'Tokyo, Japan.', translation: 'Japón' },
          { term: 'Japanese', definition: 'De Japón; también el idioma.', example: 'Japanese culture.', translation: 'japonés/a' },
        ],
      },
    ],
  },
  {
    slug: 'greetings',
    name: 'Saludos y cortesía',
    description: 'Lo que dirás en cada conversación.',
    iconKey: 'greetings',
    order: 4,
    lessons: [
      {
        title: 'Saludos del día',
        description: 'Cómo abrir y cerrar una conversación.',
        level: 'A1',
        cards: [
          { term: 'hello', definition: 'Saludo informal.', example: 'Hello, how are you?', translation: 'hola' },
          { term: 'good morning', definition: 'Saludo de la mañana.', example: 'Good morning, team!', translation: 'buenos días' },
          { term: 'good afternoon', definition: 'Saludo de la tarde.', example: 'Good afternoon, everyone.', translation: 'buenas tardes' },
          { term: 'good evening', definition: 'Saludo de la noche.', example: 'Good evening, sir.', translation: 'buenas noches (saludo)' },
          { term: 'good night', definition: 'Despedida al irse a dormir.', example: 'Good night, see you tomorrow.', translation: 'buenas noches (despedida)' },
          { term: 'goodbye', definition: 'Despedida informal.', example: 'Goodbye, talk soon.', translation: 'adiós' },
          { term: 'see you', definition: 'Hasta luego.', example: 'See you later!', translation: 'hasta luego' },
          { term: 'how are you?', definition: 'Pregunta estándar de cortesía.', example: 'Hi Maria, how are you?', translation: '¿cómo estás?' },
        ],
      },
      {
        title: 'Cortesía',
        description: 'Por favor, gracias y disculpas.',
        level: 'A1',
        cards: [
          { term: 'please', definition: 'Se usa para pedir algo con educación.', example: 'Could you help me, please?', translation: 'por favor' },
          { term: 'thank you', definition: 'Agradecimiento.', example: 'Thank you for your help.', translation: 'gracias' },
          { term: 'thanks', definition: 'Agradecimiento informal.', example: 'Thanks a lot!', translation: 'gracias (informal)' },
          { term: 'you\'re welcome', definition: 'Respuesta a un agradecimiento.', example: 'You\'re welcome, anytime.', translation: 'de nada' },
          { term: 'sorry', definition: 'Disculpa.', example: 'Sorry, I am late.', translation: 'lo siento' },
          { term: 'excuse me', definition: 'Para llamar la atención o pedir permiso.', example: 'Excuse me, where is the bathroom?', translation: 'disculpe' },
          { term: 'no problem', definition: 'No hay problema.', example: 'No problem at all.', translation: 'no hay problema' },
        ],
      },
    ],
  },
  {
    slug: 'verbs',
    name: 'Verbos esenciales',
    description: 'Los verbos más usados en inglés, en presente simple.',
    iconKey: 'verbs',
    order: 5,
    lessons: [
      {
        title: 'Verbos básicos',
        description: 'Los cimientos de cualquier oración.',
        level: 'A1',
        cards: [
          { term: 'to be', definition: 'Ser o estar. Conjugación: am/is/are.', example: 'I am a developer.', translation: 'ser/estar' },
          { term: 'to have', definition: 'Tener. Conjugación: have/has.', example: 'I have two meetings today.', translation: 'tener' },
          { term: 'to do', definition: 'Hacer (tareas, acciones). Conjugación: do/does.', example: 'I do my homework.', translation: 'hacer' },
          { term: 'to go', definition: 'Ir. Conjugación: go/goes.', example: 'I go to the office.', translation: 'ir' },
          { term: 'to want', definition: 'Querer. Conjugación: want/wants.', example: 'I want a coffee.', translation: 'querer' },
          { term: 'to need', definition: 'Necesitar. Conjugación: need/needs.', example: 'I need help.', translation: 'necesitar' },
          { term: 'to like', definition: 'Gustar. Conjugación: like/likes.', example: 'I like this song.', translation: 'gustar' },
          { term: 'to make', definition: 'Hacer, fabricar, preparar.', example: 'I make coffee every morning.', translation: 'hacer/fabricar' },
        ],
      },
      {
        title: 'Verbos del día a día',
        description: 'Acciones que describen tu rutina.',
        level: 'A2',
        cards: [
          { term: 'to eat', definition: 'Comer.', example: 'I eat lunch at one.', translation: 'comer' },
          { term: 'to drink', definition: 'Beber.', example: 'I drink water.', translation: 'beber' },
          { term: 'to sleep', definition: 'Dormir.', example: 'I sleep eight hours.', translation: 'dormir' },
          { term: 'to work', definition: 'Trabajar.', example: 'I work from home.', translation: 'trabajar' },
          { term: 'to learn', definition: 'Aprender.', example: 'I learn English.', translation: 'aprender' },
          { term: 'to speak', definition: 'Hablar.', example: 'I speak Spanish and English.', translation: 'hablar' },
        ],
      },
    ],
  },
  {
    slug: 'tech-work',
    name: 'Trabajo y tecnología',
    description: 'Vocabulario para reuniones, código y operaciones.',
    iconKey: 'tech',
    order: 6,
    lessons: [
      {
        title: 'La oficina moderna',
        description: 'Palabras que vas a oír cada día en tu trabajo.',
        level: 'B1',
        cards: [
          { term: 'meeting', definition: 'Reunión de trabajo.', example: 'I have a meeting at three.', translation: 'reunión' },
          { term: 'deadline', definition: 'Fecha límite de entrega.', example: 'The deadline is Friday.', translation: 'fecha límite' },
          { term: 'report', definition: 'Informe o reporte.', example: 'I am writing a report.', translation: 'informe' },
          { term: 'presentation', definition: 'Presentación.', example: 'The presentation went well.', translation: 'presentación' },
          { term: 'feedback', definition: 'Comentarios sobre tu trabajo.', example: 'Can I get some feedback?', translation: 'retroalimentación' },
          { term: 'remote', definition: 'A distancia, en remoto.', example: 'I work remote.', translation: 'remoto/a' },
        ],
      },
      {
        title: 'Ingeniería de software',
        description: 'Vocabulario técnico para el día a día del developer.',
        level: 'B2',
        cards: [
          { term: 'repository', definition: 'Almacén de código versionado.', example: 'Push your branch to the repository.', translation: 'repositorio' },
          { term: 'branch', definition: 'Rama de desarrollo en Git.', example: 'Open a new branch for the fix.', translation: 'rama' },
          { term: 'deployment', definition: 'Puesta en producción de una versión.', example: 'The deployment failed.', translation: 'despliegue' },
          { term: 'bug', definition: 'Error de software.', example: 'I fixed a critical bug.', translation: 'error' },
          { term: 'feature', definition: 'Funcionalidad nueva.', example: 'We shipped a new feature.', translation: 'funcionalidad' },
          { term: 'review', definition: 'Revisión de código.', example: 'I left a review on your PR.', translation: 'revisión' },
        ],
      },
    ],
  },
];

const SYSTEM_USER_ID = 'seed-system-user';
const SYSTEM_USER_EMAIL = 'system@engclass.local';
const SYSTEM_USER_NAME = 'Engclass Seed';

async function ensureSystemUser(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { id: SYSTEM_USER_ID } });
  if (existing) {
    return existing.id;
  }
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
  const created = await prisma.user.create({
    data: {
      id: SYSTEM_USER_ID,
      email: SYSTEM_USER_EMAIL,
      passwordHash,
      displayName: SYSTEM_USER_NAME,
    },
  });
  return created.id;
}

async function pruneObsoleteCategories(currentSlugs: Set<string>): Promise<void> {
  const all = await prisma.category.findMany({ select: { id: true, slug: true } });
  const stale = all.filter((c) => !currentSlugs.has(c.slug));
  for (const c of stale) {
    const lessons = await prisma.lesson.findMany({
      where: { categoryId: c.id },
      select: { id: true },
    });
    for (const l of lessons) {
      await prisma.lesson.delete({ where: { id: l.id } });
    }
    await prisma.category.delete({ where: { id: c.id } });
    console.log(`prune: removed category ${c.slug} (${lessons.length} lessons)`);
  }
}

async function main(): Promise<void> {
  const ownerId = await ensureSystemUser();
  const currentSlugs = new Set(seed.map((c) => c.slug));
  await pruneObsoleteCategories(currentSlugs);
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
              owner: { connect: { id: ownerId } },
              category: { connect: { id: category.id } },
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
