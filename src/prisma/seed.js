const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Courses
  await prisma.course.createMany({
    data: [
      { id: 1, imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/7488bd7cd28b768ec2469847a5bc831e.svg', title: 'FRENCH' },
      { id: 2, imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/097f1c20a4f421aa606367cd33893083.svg', title: 'GERMAN' },
      { id: 3, imageSrc: 'https://d35aaqx5ub95lt.cloudfront.net/images/borderlessFlags/40a9ce3dfafe484bced34cdc124a59e4.svg', title: 'SPANISH' },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Courses seeded');

  // Quest definitions
  await prisma.questDefinition.createMany({
    data: [
      { code: 'EARN_XP',         target: 10, rewardPoints: 10,  active: true },
      { code: 'COMPLETE_LESSON',  target: 1,  rewardPoints: 15, active: true },
      { code: 'PERFECT_LESSON',   target: 1,  rewardPoints: 20, active: true },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Quest definitions seeded');

  // Monthly challenge definitions
  await prisma.monthlyChallengeDefinition.createMany({
    data: [
      { code: 'MONTHLY_XP',      target: 100, rewardPoints: 100, active: true },
      { code: 'MONTHLY_LESSONS',  target: 10,  rewardPoints: 50,  active: true },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Monthly challenge definitions seeded');

  // Sections — 5 per course
  const sectionTitles = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'];
  const sectionData = [];
  for (const courseId of [1, 2, 3]) {
    sectionTitles.forEach((title, i) => sectionData.push({ courseId, orderIndex: i + 1, title }));
  }
  await prisma.section.createMany({ data: sectionData, skipDuplicates: true });
  console.log('✓ Sections seeded');

  // Units — 2 per section
  const sections = await prisma.section.findMany({ orderBy: [{ courseId: 'asc' }, { orderIndex: 'asc' }] });
  const colors   = ['#CE82FF', '#FF9600', '#1CB0F6', '#FF4B4B', '#58CC02'];
  const unitData = [];
  const counter  = {};
  for (const s of sections) {
    if (!counter[s.courseId]) counter[s.courseId] = 1;
    for (let u = 0; u < 2; u++) {
      unitData.push({
        title: `Unit ${counter[s.courseId]}`,
        description: `Vocabulary & phrases — Unit ${counter[s.courseId]}`,
        courseId: s.courseId,
        sectionId: s.id,
        orderIndex: counter[s.courseId],
        color: colors[(counter[s.courseId] - 1) % colors.length],
        animationPath: `/animations/unit_${counter[s.courseId]}.json`,
      });
      counter[s.courseId]++;
    }
  }
  await prisma.unit.createMany({ data: unitData, skipDuplicates: true });
  console.log('✓ Units seeded');

  // Path icons
  const units        = await prisma.unit.findMany();
  const icons        = ['🌟', '🎯', '🔥', '💡', '🚀', '🎓', '🌍', '💬', '🧠', '🏆'];
  const pathIconData = units.map((u, i) => ({ unitId: u.id, icon: icons[i % icons.length] }));
  await prisma.pathIcon.createMany({ data: pathIconData, skipDuplicates: true });
  console.log('✓ Path icons seeded');

  // Lessons — 3 per unit
  const allUnits   = await prisma.unit.findMany();
  const lessonTypes = ['vocabulary', 'grammar', 'speaking'];
  const lessonData  = [];
  for (const unit of allUnits) {
    for (let l = 1; l <= 3; l++) {
      lessonData.push({ title: `Lesson ${l} — ${unit.title}`, unitId: unit.id, orderIndex: l, type: 'Lesson', lessonType: lessonTypes[l - 1] });
    }
  }
  await prisma.lesson.createMany({ data: lessonData, skipDuplicates: true });
  console.log('✓ Lessons seeded');

  // Exercises — 3 per lesson (first 10 lessons only)
  const firstLessons   = await prisma.lesson.findMany({ take: 10 });
  const exerciseTypes  = ['SELECT', 'MATCH', 'FILL_BLANK'];
  const exerciseData   = [];
  for (const lesson of firstLessons) {
    for (let e = 1; e <= 3; e++) {
      exerciseData.push({ lessonId: lesson.id, type: exerciseTypes[(e - 1) % 3], prompt: `Exercise ${e} — ${lesson.title}`, orderIndex: e });
    }
  }
  await prisma.exercise.createMany({ data: exerciseData, skipDuplicates: true });
  console.log('✓ Exercises seeded');

  // Exercise options — 4 per exercise (first correct)
  const allExercises = await prisma.exercise.findMany();
  const optionData   = [];
  for (const ex of allExercises) {
    for (let o = 1; o <= 4; o++) {
      optionData.push({ exerciseId: ex.id, content: `Option ${o} for exercise ${ex.id}`, isCorrect: o === 1, answerOrder: o });
    }
  }
  await prisma.exerciseOption.createMany({ data: optionData, skipDuplicates: true });
  console.log('✓ Exercise options seeded');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
