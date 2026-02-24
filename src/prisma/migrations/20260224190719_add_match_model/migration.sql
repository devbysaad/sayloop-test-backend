-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "requester_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "session_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_matches_requester" ON "matches"("requester_id");

-- CreateIndex
CREATE INDEX "idx_matches_receiver" ON "matches"("receiver_id");

-- CreateIndex
CREATE INDEX "idx_matches_status_created" ON "matches"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_matches_session" ON "matches"("session_id");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
