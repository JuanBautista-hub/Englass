import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

interface SeedCard {
  term: string;
  definition: string;
  example: string;
  translation: string;
  explanationEs: string;
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
    slug: 'grammar',
    name: 'Gramática',
    description: 'Reglas prácticas para construir frases correctas.',
    iconKey: 'grammar',
    order: 6,
    lessons: [
      {
        title: 'Preposiciones on / in / at',
        description: 'Cuándo usar on, in y at para tiempo y lugar.',
        level: 'A2',
        cards: [
          { term: 'on', definition: 'Días de la semana y fechas específicas.', example: 'The meeting is on Monday. / I was born on March 15th.', translation: 'en (día/fecha)' },
          { term: 'on', definition: 'Superficies y líneas (cosas encima de algo).', example: 'The book is on the table. / The picture is on the wall.', translation: 'sobre' },
          { term: 'in', definition: 'Meses, años, estaciones y siglos.', example: 'I started in 2020. / We travel in summer. / Born in the 90s.', translation: 'en (mes/año/estación)' },
          { term: 'in', definition: 'Lugares cerrados (cuartos, edificios, ciudades, países).', example: 'She is in the kitchen. / I live in Spain.', translation: 'en (lugar cerrado)' },
          { term: 'in', definition: 'Partes del día: morning, afternoon, evening.', example: 'I study in the morning. / She naps in the afternoon.', translation: 'en (parte del día)' },
          { term: 'at', definition: 'Horas y momentos puntuales.', example: 'The class starts at 9:00. / See you at noon.', translation: 'a (hora)' },
          { term: 'at', definition: 'Lugares puntuales: la puerta, una parada, una dirección.', example: "I'm at the door. / Meet me at the bus stop.", translation: 'en (lugar puntual)' },
          { term: 'at night', definition: 'EXCEPCIÓN: con "night" usamos AT, no IN.', example: 'I work at night. / Owls are awake at night.', translation: 'por la noche' },
        ],
      },
      {
        title: 'Plurales regulares',
        description: 'Las reglas para formar el plural de la mayoría de los sustantivos.',
        level: 'A2',
        cards: [
          { term: 'plural +s', definition: 'La mayoría de sustantivos añaden -s.', example: 'cat → cats, dog → dogs, book → books', translation: 'plural general' },
          { term: 'plural +es', definition: 'Terminados en -s, -x, -z, -ch, -sh añaden -es.', example: 'bus → buses, box → boxes, watch → watches, dish → dishes', translation: 'plural +es' },
          { term: 'plural -y → -ies', definition: 'Si termina en consonante + y, cambia a -ies.', example: 'city → cities, baby → babies, country → countries', translation: 'consonante + y → ies' },
          { term: 'plural -y → -ys', definition: 'Si termina en vocal + y, solo añade -s (NO cambia).', example: 'day → days, boy → boys, key → keys, monkey → monkeys', translation: 'vocal + y → +s' },
          { term: 'plural -f → -ves', definition: 'Algunos terminados en -f o -fe cambian a -ves.', example: 'wolf → wolves, knife → knives, leaf → leaves, wife → wives', translation: '-f/-fe → -ves' },
          { term: 'plural -o → -oes', definition: 'Algunos terminados en -o añaden -es (palabras de origen latino o hispano).', example: 'potato → potatoes, tomato → tomatoes, hero → heroes', translation: '-o → +es' },
        ],
      },
      {
        title: 'Plurales irregulares',
        description: 'Sustantivos que no siguen las reglas regulares.',
        level: 'A2',
        cards: [
          { term: 'cambio de vocal', definition: 'Algunos plurales cambian solo la vocal interna.', example: 'man → men, woman → women, foot → feet, tooth → teeth, mouse → mice, goose → geese', translation: 'cambio vocálico' },
          { term: 'plural -um → -a', definition: 'Palabras de origen latino terminadas en -um cambian a -a.', example: 'medium → media, bacterium → bacteria, curriculum → curricula', translation: '-um → -a' },
          { term: 'plural -is → -es', definition: 'Palabras de origen griego terminadas en -is cambian a -es.', example: 'crisis → crises, analysis → analyses, basis → bases', translation: '-is → -es' },
          { term: 'plural -on → -a', definition: 'Algunas palabras terminadas en -on cambian a -a.', example: 'phenomenon → phenomena, criterion → criteria', translation: '-on → -a' },
          { term: 'plural invariable', definition: 'Algunos sustantivos no cambian en plural.', example: 'sheep → sheep, fish → fish, deer → deer, aircraft → aircraft, species → species', translation: 'sin cambio' },
          { term: 'plural obligatorio', definition: 'Algunos objetos solo se usan en plural en inglés.', example: 'scissors, trousers, glasses, pants, clothes', translation: 'siempre plural' },
          { term: 'person → people', definition: '"person" → "people" (NO "persons", que existe pero es formal/raro).', example: 'Three people came to the meeting. / People are funny.', translation: 'persona → personas' },
        ],
      },
      {
        title: 'Artículos a / an / the',
        description: 'Cuándo usar a, an, the o nada en inglés.',
        level: 'A2',
        cards: [
          { term: 'a', definition: 'Se usa "a" antes de un sustantivo singular contable que empieza con sonido de consonante.', example: 'a book, a car, a university (porque "uni-" suena /juː/, vocal)', translation: 'un/una (consonante)' },
          { term: 'an', definition: 'Se usa "an" antes de un sustantivo singular contable que empieza con sonido de vocal (a, e, i, o, u).', example: 'an apple, an hour (h muda), an honest person, an EU citizen', translation: 'un/una (vocal)' },
          { term: 'the (específico)', definition: 'Se usa "the" cuando el oyente sabe a qué nos referimos (específico o único).', example: 'The book on the table is mine. / The President will speak today.', translation: 'el/la (específico)' },
          { term: 'the (ya mencionado)', definition: 'Se usa "the" con algo ya mencionado o conocido por ambos.', example: 'I bought a car. The car is red.', translation: 'el/la (ya mencionado)' },
          { term: '∅ plural genérico', definition: 'Los plurales genéricos NO llevan artículo.', example: 'I like cats. / Books are expensive. / We need engineers.', translation: 'sin artículo (plural genérico)' },
          { term: '∅ incontables', definition: 'Los nombres incontables (agua, información, dinero) NO usan a/an.', example: 'I drink water. / I need information. / Money is important.', translation: 'sin artículo (incontables)' },
        ],
      },
      {
        title: 'Presente simple vs continuo',
        description: 'Cuándo usar cada forma del presente.',
        level: 'A2',
        cards: [
          { term: 'present simple', definition: 'Hábitos, rutinas y verdades generales.', example: 'I work every day. / She drinks coffee in the morning. / Water boils at 100°C.', translation: 'presente simple: hábitos' },
          { term: 'present continuous', definition: 'Acciones que están pasando AHORA (en este momento).', example: 'I am working right now. / She is drinking coffee. / Look! It is raining.', translation: 'presente continuo: ahora' },
          { term: 'present continuous (futuro)', definition: 'Planes temporales confirmados para el futuro cercano.', example: 'I am meeting John tomorrow. / We are traveling next week.', translation: 'presente continuo: planes' },
          { term: 'stative verbs', definition: 'Verbos de estado (know, like, want, need, believe) NO usan continuous.', example: "I know the answer. (NO 'I am knowing') / She wants a coffee.", translation: 'verbos de estado' },
          { term: 'señaladores', definition: 'Always/usually/often/every day → simple. Now/today/look! → continuous.', example: 'I always read at night. / I am reading right now.', translation: 'señaladores' },
        ],
      },
      {
        title: 'Pasado simple',
        description: 'Cómo formar y usar el pasado en inglés.',
        level: 'A2',
        cards: [
          { term: 'regular +ed', definition: 'Los verbos regulares añaden -ed en pasado.', example: 'work → worked, play → played, watch → watched', translation: '+ed' },
          { term: '-e → +d', definition: 'Si el verbo ya termina en -e, solo añade -d.', example: 'like → liked, live → lived, use → used', translation: '-e → +d' },
          { term: 'consonant + y → -ied', definition: 'Terminados en consonante + y cambian a -ied.', example: 'study → studied, carry → carried, try → tried', translation: 'consonant + y → ied' },
          { term: 'CVC doble', definition: 'Verbos cortos con consonant-vowel-consonant doblan la última consonante.', example: 'stop → stopped, plan → planned, shop → shopped', translation: 'doble consonante' },
          { term: 'irregulares', definition: 'Los verbos irregulares tienen una forma propia en pasado — hay que memorizarlos.', example: 'go → went, have → had, see → saw, eat → ate, take → took, make → made', translation: 'irregulares' },
          { term: 'señaladores', definition: 'Yesterday, last week, in 2020, ago → past simple.', example: 'I saw her yesterday. / We traveled last summer. / He left two hours ago.', translation: 'señaladores' },
        ],
      },
      {
        title: 'Comparativos y superlativos',
        description: 'Cómo comparar en inglés.',
        level: 'A2',
        cards: [
          { term: 'short +er / +est', definition: 'Adjetivos cortos añaden -er (comparativo) y -est (superlativo).', example: 'tall → taller / tallest, cheap → cheaper / cheapest, old → older / oldest', translation: 'cortos: +er / +est' },
          { term: 'consonant + y', definition: 'Terminados en consonante + y cambian a -ier / -iest.', example: 'happy → happier / happiest, easy → easier / easiest, funny → funnier / funniest', translation: 'consonant + y → -ier/-iest' },
          { term: 'CVC doble', definition: 'Adjetivos CVC (consonant-vowel-consonant) doblan la última consonante.', example: 'big → bigger / biggest, hot → hotter / hottest, fat → fatter / fattest', translation: 'CVC doble' },
          { term: 'more / most', definition: 'Adjetivos largos (3+ sílabas) usan "more" / "most".', example: 'expensive → more expensive / most expensive, interesting → more interesting / most interesting', translation: 'largos: more / most' },
          { term: 'irregulares', definition: 'Algunos adjetivos son completamente irregulares.', example: 'good → better / best, bad → worse / worst, far → farther/further / farthest/furthest', translation: 'irregulares' },
          { term: 'than / the', definition: 'Se usa "than" con el comparativo y "the" con el superlativo.', example: 'She is taller than me. / He is the tallest in the class.', translation: 'than / the' },
        ],
      },
      {
        title: 'Palabras interrogativas',
        description: 'Las palabras WH para hacer preguntas.',
        level: 'A1',
        cards: [
          { term: 'who', definition: 'WHO pregunta por personas (sujeto u objeto).', example: 'Who is your teacher? / Who wrote this? / Who did you meet?', translation: 'quién' },
          { term: 'what', definition: 'WHAT pregunta por cosas, profesiones o identidad.', example: 'What is this? / What do you do? / What time is it?', translation: 'qué' },
          { term: 'where', definition: 'WHERE pregunta por lugar.', example: 'Where do you live? / Where is the station? / Where did you go?', translation: 'dónde' },
          { term: 'when', definition: 'WHEN pregunta por tiempo.', example: 'When is the meeting? / When did you arrive? / When does the train leave?', translation: 'cuándo' },
          { term: 'why', definition: 'WHY pregunta por razón o causa.', example: 'Why are you late? / Why did you say that? / Why is the sky blue?', translation: 'por qué' },
          { term: 'how', definition: 'HOW pregunta por manera. HOW + adj/adv pregunta por grado (how old, how often, how much).', example: 'How do you spell it? / How old are you? / How often do you exercise?', translation: 'cómo' },
        ],
      },
    ],
  },
  {
    slug: 'tech-work',
    name: 'Trabajo y tecnología',
    description: 'Vocabulario para reuniones, código y operaciones.',
    iconKey: 'tech',
    order: 7,
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

async function dedupeLessons(): Promise<void> {
  const all = await prisma.lesson.findMany({ orderBy: { createdAt: 'asc' } });
  const seen = new Map<string, string>();
  const toDelete: string[] = [];
  for (const l of all) {
    const key = `${l.categoryId}::${l.title}`;
    if (seen.has(key)) {
      toDelete.push(l.id);
    } else {
      seen.set(key, l.id);
    }
  }
  for (const id of toDelete) {
    await prisma.lesson.delete({ where: { id } });
  }
  if (toDelete.length > 0) {
    console.log(`dedupe: removed ${toDelete.length} duplicate lesson(s)`);
  }
}

async function main(): Promise<void> {
  const ownerId = await ensureSystemUser();
  const currentSlugs = new Set(seed.map((c) => c.slug));
  await pruneObsoleteCategories(currentSlugs);
  await dedupeLessons();
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
            explanationEs: card.explanationEs,
            level: lesson.level,
          },
          update: {
            term: card.term,
            definition: card.definition,
            example: card.example,
            translation: card.translation,
            explanationEs: card.explanationEs,
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
