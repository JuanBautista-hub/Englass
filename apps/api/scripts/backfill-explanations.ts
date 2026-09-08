import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hand-written Spanish explanations for grammar rules (term -> explanationEs).
// For everything else we fall back to a generic template.
const GRAMMAR_EXPLANATIONS: Record<string, string> = {
  // on / in / at
  'on': 'En inglés se usa "on" para referirse a días de la semana, fechas específicas y superficies (cosas que están encima de algo). Ejemplos: "on Monday" (el lunes), "on the table" (sobre la mesa).',
  'at': 'En inglés se usa "at" para horas exactas y lugares puntuales (una dirección, una parada). Ejemplos: "at 9:00" (a las nueve), "at the door" (en la puerta).',
  'at night': 'OJO: con "night" se usa AT, no IN. Decimos "at night" para significar "por la noche". Ejemplo: "I work at night" (Trabajo por la noche).',

  // Plurales regulares
  'plural +s': 'La regla más común del plural en inglés: añade una -s al final del sustantivo. Ejemplos: "cat" (gato) → "cats" (gatos), "book" (libro) → "books" (libros).',
  'plural +es': 'Si el sustantivo termina en -s, -x, -z, -ch o -sh, el plural se forma añadiendo -es. Ejemplos: "bus" → "buses", "box" → "boxes", "watch" → "watches".',
  'plural -y → -ies': 'Si el sustantivo termina en consonante seguida de "y", cambia la "y" por "-ies". Ejemplos: "city" (ciudad) → "cities", "baby" (bebé) → "babies", "country" (país) → "countries".',
  'plural -y → -ys': 'Si el sustantivo termina en vocal seguida de "y", solo añade -s (la "y" no cambia). Ejemplos: "day" (día) → "days", "boy" (niño) → "boys", "key" (llave) → "keys".',
  'plural -f → -ves': 'Algunos sustantivos terminados en -f o -fe cambian a -ves en plural. Ejemplos: "wolf" (lobo) → "wolves", "knife" (cuchillo) → "knives", "wife" (esposa) → "wives".',
  'plural -o → -oes': 'Algunos sustantivos terminados en -o añaden -es en plural (palabras de origen latino o hispano). Ejemplos: "potato" (papa) → "potatoes", "tomato" (tomate) → "tomatoes", "hero" (héroe) → "heroes".',

  // Plurales irregulares
  'cambio de vocal': 'Algunos plurales irregulares cambian solo la vocal interna. Memoriza los más comunes: man (hombre) → men, woman (mujer) → women, foot (pie) → feet, tooth (diente) → teeth, mouse (ratón) → mice, goose (ganso) → geese.',
  'plural -um → -a': 'Palabras de origen latino terminadas en -um forman el plural cambiando a -a. Ejemplos: "medium" → "media", "bacterium" → "bacteria", "curriculum" → "curricula".',
  'plural -is → -es': 'Palabras de origen griego terminadas en -is forman el plural cambiando a -es. Ejemplos: "crisis" (crisis) → "crises", "analysis" (análisis) → "analyses", "basis" (base) → "bases".',
  'plural -on → -a': 'Algunas palabras terminadas en -on forman el plural cambiando a -a. Ejemplos: "phenomenon" (fenómeno) → "phenomena", "criterion" (criterio) → "criteria".',
  'plural invariable': 'Algunos sustantivos en inglés son invariables: tienen la misma forma en singular y en plural. Ejemplos: "sheep" (oveja/ovejas), "fish" (pez/peces), "deer" (ciervo/ciervos), "aircraft" (aeronave/aeronaves), "species" (especie/especies).',
  'plural obligatorio': 'Algunos objetos en inglés solo se usan en plural (no tienen forma singular). Ejemplos: "scissors" (tijeras), "trousers" (pantalones), "glasses" (gafas), "pants" (pantalones), "clothes" (ropa).',
  'person → people': 'En inglés, "person" en plural es "people" (NO "persons", que existe pero es muy formal o raro). Ejemplos: "three people" (tres personas), "many people" (mucha gente).',

  // Articulos
  'a': 'Se usa "a" antes de un sustantivo singular contable que empieza con sonido de consonante. Ejemplos: "a book" (un libro), "a car" (un coche). Importante: si la palabra empieza con "u" o "o" pero suena consonante, también usa "a" (a university).',
  'an': 'Se usa "an" antes de un sustantivo singular contable que empieza con sonido de vocal (a, e, i, o, u). Ejemplos: "an apple" (una manzana), "an hour" (una hora), "an honest person" (una persona honesta).',
  'the (específico)': 'Se usa "the" cuando el oyente sabe a qué cosa nos referimos (específico o único). Ejemplos: "The book on the table is mine" (El libro sobre la mesa es mío), "The President will speak" (El Presidente hablará).',
  'the (ya mencionado)': 'Se usa "the" con algo ya mencionado o conocido por ambos hablantes. Ejemplo: "I bought a car. The car is red." (Compré un coche. El coche es rojo.)',
  '∅ plural genérico': 'En inglés, los plurales genéricos (cuando hablamos en general, sin referirnos a uno concreto) NO llevan artículo. Ejemplos: "I like cats" (Me gustan los gatos), "Books are expensive" (Los libros son caros).',
  '∅ incontables': 'Los sustantivos incontables (agua, información, dinero, etc.) NO usan "a" ni "an". Ejemplos: "I drink water" (Bebo agua), "I need information" (Necesito información).',

  // Presente simple vs continuo
  'present simple': 'Se usa el presente simple para hablar de hábitos, rutinas y verdades generales. Estructura: sujeto + verbo. Ejemplos: "I work every day" (Trabajo todos los días), "Water boils at 100°C" (El agua hierve a 100°C).',
  'present continuous': 'Se usa el presente continuo (sujeto + am/is/are + verbo-ing) para acciones que están pasando AHORA. Ejemplos: "I am working right now" (Estoy trabajando ahora), "She is drinking coffee" (Ella está tomando café).',
  'present continuous (futuro)': 'El presente continuo también se usa para planes futuros confirmados. Ejemplos: "I am meeting John tomorrow" (Me reúno con John mañana), "We are traveling next week" (Viajamos la próxima semana).',
  'stative verbs': 'Los verbos de estado (know, like, want, need, believe, etc.) describen estados, no acciones, y NO se usan en continuo. Decimos "I know the answer" (NO "I am knowing the answer"), "She wants a coffee" (NO "She is wanting").',
  'señaladores': 'Palabras como "always", "usually", "often", "every day" indican hábito → presente simple. Palabras como "now", "today", "look!" indican acción en curso → presente continuo. Ejemplos: "I always read at night" vs "I am reading right now".',

  // Pasado simple
  'regular +ed': 'En inglés, los verbos regulares forman el pasado añadiendo "-ed" al infinitivo. Ejemplos: "work" → "worked", "play" → "played", "watch" → "watched".',
  '-e → +d': 'Si el verbo ya termina en -e, solo añadimos -d. Ejemplos: "like" → "liked", "live" → "lived", "use" → "used".',
  'consonant + y → -ied': 'Si el verbo termina en consonante seguida de "y", cambia la "y" por "-ied". Ejemplos: "study" → "studied", "carry" → "carried", "try" → "tried".',
  'CVC doble': 'Los verbos cortos con la estructura consonante-vocal-consonante (CVC) doblan la última consonante antes de añadir -ed. Ejemplos: "stop" → "stopped", "plan" → "planned", "shop" → "shopped".',
  'irregulares': 'Los verbos irregulares NO siguen las reglas: hay que memorizar su forma de pasado. Los más comunes: go → went, have → had, see → saw, eat → ate, take → took, make → made.',
  'señaladores (pasado)': 'Palabras como "yesterday" (ayer), "last week" (la semana pasada), "in 2020" (en 2020), "ago" (hace...) indican pasado simple. Ejemplos: "I saw her yesterday" (La vi ayer), "He left two hours ago" (Se fue hace dos horas).',

  // Comparativos
  'short +er / +est': 'Los adjetivos cortos forman el comparativo con "-er" y el superlativo con "-est". Ejemplos: "tall" (alto) → "taller" (más alto) / "tallest" (el más alto), "cheap" (barato) → "cheaper" / "cheapest".',
  'consonant + y': 'En adjetivos cortos terminados en consonante + y, cambia la "y" por "-ier" (comparativo) o "-iest" (superlativo). Ejemplos: "happy" (feliz) → "happier" / "happiest", "easy" (fácil) → "easier" / "easiest".',
  'CVC doble (adj)': 'Adjetivos cortos CVC (consonante-vocal-consonante) doblan la última consonante. Ejemplos: "big" (grande) → "bigger" / "biggest", "hot" (caliente) → "hotter" / "hottest".',
  'more / most': 'Los adjetivos largos (3 o más sílabas) usan "more" para el comparativo y "most" para el superlativo. Ejemplos: "expensive" → "more expensive" / "most expensive", "interesting" → "more interesting" / "most interesting".',
  'irregulares (comparativos)': 'Algunos adjetivos son completamente irregulares: good (bueno) → better / best (mejor / el mejor), bad (malo) → worse / worst (peor / el peor), far (lejos) → farther/further / farthest/furthest.',
  'than / the': 'Con el comparativo usamos "than" (que): "She is taller than me" (Ella es más alta que yo). Con el superlativo usamos "the": "She is the tallest in the class" (Ella es la más alta de la clase).',

  // Question words
  'who': 'WHO pregunta por personas (sujeto u objeto). Ejemplos: "Who is your teacher?" (¿Quién es tu profesora?), "Who did you meet?" (¿A quién conociste?).',
  'what': 'WHAT pregunta por cosas, profesiones o identidad. Ejemplos: "What is this?" (¿Qué es esto?), "What do you do?" (¿A qué te dedicas?), "What time is it?" (¿Qué hora es?).',
  'where': 'WHERE pregunta por lugar. Ejemplos: "Where do you live?" (¿Dónde vives?), "Where is the station?" (¿Dónde está la estación?).',
  'when': 'WHEN pregunta por tiempo. Ejemplos: "When is the meeting?" (¿Cuándo es la reunión?), "When did you arrive?" (¿Cuándo llegaste?).',
  'why': 'WHY pregunta por razón o causa. Ejemplos: "Why are you late?" (¿Por qué llegas tarde?), "Why is the sky blue?" (¿Por qué el cielo es azul?).',
  'how': 'HOW pregunta por manera. HOW + adjetivo/adverbio pregunta por grado (how old = cuántos años, how often = con qué frecuencia, how much = cuánto). Ejemplos: "How do you spell it?" (¿Cómo se escribe?), "How old are you?" (¿Cuántos años tienes?).',
};

const TERM_EXCEPTIONS: Record<string, string> = {
  // small exceptions for vocab cards with multi-word terms
  'at night': GRAMMAR_EXPLANATIONS['at night'],
};

function explainFor(term: string, translation: string | null, definition: string, example: string | null): string {
  const direct = GRAMMAR_EXPLANATIONS[term] ?? TERM_EXCEPTIONS[term];
  if (direct) {
    return direct;
  }
  // Generic vocab template
  const spanish = translation ?? definition;
  const exampleEs = example ? ` Por ejemplo: "${example}".` : '';
  return `En inglés: "${term}". Significado en español: "${spanish}".${exampleEs}`;
}

async function main(): Promise<void> {
  const cards = await prisma.vocabularyCard.findMany();
  let updated = 0;
  for (const c of cards) {
    const next = explainFor(c.term, c.translation, c.definition, c.example);
    if (c.explanationEs !== next) {
      await prisma.vocabularyCard.update({
        where: { id: c.id },
        data: { explanationEs: next },
      });
      updated += 1;
    }
  }
  console.log(`backfill: updated ${updated} of ${cards.length} cards`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
