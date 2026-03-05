const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Language → Course mapping ────────────────────────────────────────────────
// These match the learningLanguage codes used in onboarding
const COURSES = [
  {
    id: 1,
    title: 'FRENCH',
    imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/7488bd7cd28b768ec2469847a5bc831e.svg',
    langCode: 'fr',
  },
  {
    id: 2,
    title: 'GERMAN',
    imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/097f1c20a4f421aa606367cd33893083.svg',
    langCode: 'de',
  },
  {
    id: 3,
    title: 'SPANISH',
    imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/40a9ce3dfafe484bced34cdc124a59e4.svg',
    langCode: 'es',
  },
  {
    id: 4,
    title: 'ARABIC',
    imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/a595eb4de12bb4e2b4e1fefcd2e1ae8e.svg',
    langCode: 'ar',
  },
  {
    id: 5,
    title: 'JAPANESE',
    imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/a03e1f7b4b4e3c5f5f9e4e3c5f5f9e4e.svg',
    langCode: 'ja',
  },
  {
    id: 6,
    title: 'TURKISH',
    imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6.svg',
    langCode: 'tr',
  },
];

const SECTION_TITLES = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'];
const UNIT_COLORS    = ['#CE82FF', '#FF9600', '#1CB0F6', '#FF4B4B', '#58CC02'];
const PATH_ICONS     = ['🌟', '🎯', '🔥', '💡', '🚀', '🎓', '🌍', '💬', '🧠', '🏆'];
const LESSON_TYPES   = ['vocabulary', 'grammar', 'speaking'];
const EXERCISE_TYPES = ['SELECT', 'MATCH', 'FILL_BLANK'];

async function main() {
  console.log('🌱 Starting seed...\n');

  // ── Courses ────────────────────────────────────────────────────────────────
  await prisma.course.createMany({
    data: COURSES.map(({ id, title, imageSrc }) => ({ id, title, imageSrc })),
    skipDuplicates: true,
  });
  console.log(`✓ ${COURSES.length} courses seeded`);

  // ── Quest definitions ──────────────────────────────────────────────────────
  await prisma.questDefinition.createMany({
    data: [
      { code: 'EARN_XP',        target: 10, rewardPoints: 10,  active: true },
      { code: 'COMPLETE_LESSON', target: 1,  rewardPoints: 15, active: true },
      { code: 'PERFECT_LESSON',  target: 1,  rewardPoints: 20, active: true },
      { code: 'STREAK_3',        target: 3,  rewardPoints: 30, active: true },
      { code: 'MATCH_PARTNER',   target: 1,  rewardPoints: 25, active: true },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Quest definitions seeded');

  // ── Monthly challenge definitions ──────────────────────────────────────────
  await prisma.monthlyChallengeDefinition.createMany({
    data: [
      { code: 'MONTHLY_XP',      target: 100, rewardPoints: 100, active: true },
      { code: 'MONTHLY_LESSONS', target: 10,  rewardPoints: 50,  active: true },
      { code: 'MONTHLY_STREAK',  target: 20,  rewardPoints: 75,  active: true },
      { code: 'MONTHLY_MATCHES', target: 5,   rewardPoints: 60,  active: true },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Monthly challenge definitions seeded');

  // ── Sections (5 per course) ────────────────────────────────────────────────
  const sectionData = [];
  for (const course of COURSES) {
    SECTION_TITLES.forEach((title, i) =>
      sectionData.push({ courseId: course.id, orderIndex: i + 1, title })
    );
  }
  await prisma.section.createMany({ data: sectionData, skipDuplicates: true });
  console.log(`✓ ${sectionData.length} sections seeded`);

  // ── Units (2 per section) ──────────────────────────────────────────────────
  const sections = await prisma.section.findMany({
    orderBy: [{ courseId: 'asc' }, { orderIndex: 'asc' }],
  });

  const unitData = [];
  const unitCounter = {};
  for (const s of sections) {
    if (!unitCounter[s.courseId]) unitCounter[s.courseId] = 1;
    for (let u = 0; u < 2; u++) {
      const n = unitCounter[s.courseId];
      unitData.push({
        title:         `Unit ${n}`,
        description:   `Vocabulary & phrases — Unit ${n}`,
        courseId:      s.courseId,
        sectionId:     s.id,
        orderIndex:    n,
        color:         UNIT_COLORS[(n - 1) % UNIT_COLORS.length],
        animationPath: `/animations/unit_${n}.json`,
      });
      unitCounter[s.courseId]++;
    }
  }
  await prisma.unit.createMany({ data: unitData, skipDuplicates: true });
  console.log(`✓ ${unitData.length} units seeded`);

  // ── Path icons ─────────────────────────────────────────────────────────────
  const units = await prisma.unit.findMany();
  await prisma.pathIcon.createMany({
    data: units.map((u, i) => ({ unitId: u.id, icon: PATH_ICONS[i % PATH_ICONS.length] })),
    skipDuplicates: true,
  });
  console.log(`✓ ${units.length} path icons seeded`);

  // ── Lessons (3 per unit) ───────────────────────────────────────────────────
  const lessonData = [];
  for (const unit of units) {
    for (let l = 1; l <= 3; l++) {
      lessonData.push({
        title:      `Lesson ${l} — ${unit.title}`,
        unitId:     unit.id,
        orderIndex: l,
        type:       'Lesson',
        lessonType: LESSON_TYPES[l - 1],
      });
    }
  }
  await prisma.lesson.createMany({ data: lessonData, skipDuplicates: true });
  console.log(`✓ ${lessonData.length} lessons seeded`);

  // ── Exercises (3 per lesson — first 15 lessons only to keep seed fast) ─────
  const firstLessons = await prisma.lesson.findMany({
    take:    15,
    orderBy: { id: 'asc' },
  });
  const exerciseData = [];
  for (const lesson of firstLessons) {
    for (let e = 1; e <= 3; e++) {
      exerciseData.push({
        lessonId:   lesson.id,
        type:       EXERCISE_TYPES[(e - 1) % EXERCISE_TYPES.length],
        prompt:     `Exercise ${e} — ${lesson.title}`,
        orderIndex: e,
      });
    }
  }
  await prisma.exercise.createMany({ data: exerciseData, skipDuplicates: true });
  console.log(`✓ ${exerciseData.length} exercises seeded`);

  // ── Exercise options (4 per exercise, first is correct) ────────────────────
  const allExercises = await prisma.exercise.findMany();
  const optionData   = [];
  for (const ex of allExercises) {
    for (let o = 1; o <= 4; o++) {
      optionData.push({
        exerciseId:  ex.id,
        content:     `Option ${o} for exercise ${ex.id}`,
        isCorrect:   o === 1,
        answerOrder: o,
      });
    }
  }
  await prisma.exerciseOption.createMany({ data: optionData, skipDuplicates: true });
  console.log(`✓ ${optionData.length} exercise options seeded`);

  console.log('\n✅ Seed complete!');
  console.log('\n📌 Course → Language mapping (for frontend):');
  COURSES.forEach(c => console.log(`   course.id=${c.id}  langCode="${c.langCode}"  → ${c.title}`));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });