-- CreateTable
CREATE TABLE "course" (
    "id" INTEGER NOT NULL,
    "image_src" VARCHAR(255),
    "title" VARCHAR(255) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "clerk_id" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255),
    "first_name" VARCHAR(255),
    "last_name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "pfp_source" VARCHAR(255),
    "points" INTEGER NOT NULL DEFAULT 0,
    "streak_length" INTEGER NOT NULL DEFAULT 0,
    "current_course_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_submission" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_definition" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "target" INTEGER NOT NULL,
    "reward_points" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "quest_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_challenge_definition" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "target" INTEGER NOT NULL,
    "reward_points" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "monthly_challenge_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_quest" (
    "user_id" INTEGER NOT NULL,
    "quest_def_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_daily_quest_pkey" PRIMARY KEY ("user_id","quest_def_id","date")
);

-- CreateTable
CREATE TABLE "user_monthly_challenge" (
    "user_id" INTEGER NOT NULL,
    "challenge_def_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_monthly_challenge_pkey" PRIMARY KEY ("user_id","challenge_def_id","year","month")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "title" VARCHAR(255),

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "course_id" INTEGER NOT NULL,
    "section_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "animation_path" VARCHAR(255),
    "color" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "path_icons" (
    "unit_id" INTEGER NOT NULL,
    "icon" VARCHAR(255) NOT NULL,

    CONSTRAINT "path_icons_pkey" PRIMARY KEY ("unit_id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'Lesson',
    "lesson_type" VARCHAR(255),

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "prompt" VARCHAR(255) NOT NULL,
    "order_index" INTEGER NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_options" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "content" VARCHAR(255) NOT NULL,
    "image_url" VARCHAR(255),
    "is_correct" BOOLEAN NOT NULL,
    "answer_order" INTEGER,

    CONSTRAINT "exercise_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "option_id" INTEGER NOT NULL,
    "score" INTEGER,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_attempt_option" (
    "id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "option_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "exercise_attempt_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_completions" (
    "user_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_completions_pkey" PRIMARY KEY ("user_id","lesson_id")
);

-- CreateTable
CREATE TABLE "user_course_progress" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "current_lesson_id" INTEGER NOT NULL,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_course_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" SERIAL NOT NULL,
    "follower_id" INTEGER NOT NULL,
    "followed_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "ix_users_points_desc" ON "users"("points" DESC, "id" ASC);

-- CreateIndex
CREATE INDEX "ix_users_clerk_id" ON "users"("clerk_id");

-- CreateIndex
CREATE INDEX "ix_users_current_course" ON "users"("current_course_id");

-- CreateIndex
CREATE UNIQUE INDEX "quest_definition_code_key" ON "quest_definition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_challenge_definition_code_key" ON "monthly_challenge_definition"("code");

-- CreateIndex
CREATE INDEX "idx_user_daily_quest_user_date" ON "user_daily_quest"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_user_daily_quest_def_id" ON "user_daily_quest"("quest_def_id");

-- CreateIndex
CREATE INDEX "idx_user_monthly_challenge_user_period" ON "user_monthly_challenge"("user_id", "year", "month");

-- CreateIndex
CREATE INDEX "idx_user_monthly_challenge_def_id" ON "user_monthly_challenge"("challenge_def_id");

-- CreateIndex
CREATE INDEX "idx_sections_course_order" ON "sections"("course_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "uq_section_order" ON "sections"("course_id", "order_index");

-- CreateIndex
CREATE INDEX "idx_units_course_order" ON "units"("course_id", "order_index");

-- CreateIndex
CREATE INDEX "idx_units_section" ON "units"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_course_order" ON "units"("course_id", "order_index");

-- CreateIndex
CREATE INDEX "idx_lessons_unit_order" ON "lessons"("unit_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "uq_lesson_order" ON "lessons"("unit_id", "order_index");

-- CreateIndex
CREATE INDEX "idx_exercises_lesson_order" ON "exercises"("lesson_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "uq_exercise_order" ON "exercises"("lesson_id", "order_index");

-- CreateIndex
CREATE INDEX "idx_exercise_options_exercise" ON "exercise_options"("exercise_id");

-- CreateIndex
CREATE INDEX "idx_exercise_attempts_user" ON "exercise_attempts"("user_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "idx_exercise_attempts_exercise" ON "exercise_attempts"("exercise_id");

-- CreateIndex
CREATE INDEX "idx_exercise_attempt_option_attempt" ON "exercise_attempt_option"("attempt_id");

-- CreateIndex
CREATE INDEX "idx_exercise_attempt_option_option" ON "exercise_attempt_option"("option_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_attempt_position" ON "exercise_attempt_option"("attempt_id", "position");

-- CreateIndex
CREATE INDEX "idx_lesson_completions_user_course" ON "lesson_completions"("user_id", "course_id", "completed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_lesson_completions_lesson" ON "lesson_completions"("lesson_id");

-- CreateIndex
CREATE INDEX "idx_user_course_progress_user" ON "user_course_progress"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_course_progress_lesson" ON "user_course_progress"("current_lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_course" ON "user_course_progress"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "idx_follows_follower" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "idx_follows_followed" ON "follows"("followed_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_follows" ON "follows"("follower_id", "followed_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_current_course_id_fkey" FOREIGN KEY ("current_course_id") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_quest" ADD CONSTRAINT "user_daily_quest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_quest" ADD CONSTRAINT "user_daily_quest_quest_def_id_fkey" FOREIGN KEY ("quest_def_id") REFERENCES "quest_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_monthly_challenge" ADD CONSTRAINT "user_monthly_challenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_monthly_challenge" ADD CONSTRAINT "user_monthly_challenge_challenge_def_id_fkey" FOREIGN KEY ("challenge_def_id") REFERENCES "monthly_challenge_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "path_icons" ADD CONSTRAINT "path_icons_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_options" ADD CONSTRAINT "exercise_options_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempts" ADD CONSTRAINT "exercise_attempts_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "exercise_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempt_option" ADD CONSTRAINT "exercise_attempt_option_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exercise_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_attempt_option" ADD CONSTRAINT "exercise_attempt_option_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "exercise_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_course_progress" ADD CONSTRAINT "user_course_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_course_progress" ADD CONSTRAINT "user_course_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_course_progress" ADD CONSTRAINT "user_course_progress_current_lesson_id_fkey" FOREIGN KEY ("current_lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
