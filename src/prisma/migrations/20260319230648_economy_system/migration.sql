-- CreateEnum
CREATE TYPE "MatchOutcome" AS ENUM ('WIN_REQUESTER', 'WIN_RECEIVER', 'DRAW', 'RESIGN_REQUESTER', 'RESIGN_RECEIVER', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "XPReason" AS ENUM ('WIN', 'DRAW', 'RESIGN', 'STREAK_BONUS', 'LEVEL_UP_BONUS', 'QUEST_COMPLETE', 'DAILY_LOGIN', 'GEM_MILESTONE', 'FIRST_SESSION_BONUS', 'DAILY_SESSION_BONUS');

-- CreateEnum
CREATE TYPE "GemReason" AS ENUM ('MATCH_MILESTONE', 'STREAK_MILESTONE', 'LEVEL_UP', 'QUEST_REWARD', 'SHOP_PURCHASE');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "outcome" "MatchOutcome",
ADD COLUMN     "xp_awarded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_active_date" TIMESTAMP(3),
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "total_draws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_matches" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_resigns" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_wins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "week_start_date" TIMESTAMP(3),
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xp_this_week" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "XPReason" NOT NULL,
    "match_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gem_transactions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "GemReason" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gem_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_xp_transactions_user" ON "xp_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_gem_transactions_user" ON "gem_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_users_xp_desc" ON "users"("xp" DESC, "id");

-- CreateIndex
CREATE INDEX "ix_users_xp_week_desc" ON "users"("xp_this_week" DESC, "id");

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gem_transactions" ADD CONSTRAINT "gem_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
