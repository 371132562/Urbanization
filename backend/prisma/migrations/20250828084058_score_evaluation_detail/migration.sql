-- CreateTable
CREATE TABLE "ScoreEvaluationDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "countryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ScoreEvaluationDetail_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScoreEvaluationDetail_year_countryId_idx" ON "ScoreEvaluationDetail"("year", "countryId");

-- CreateIndex
CREATE INDEX "ScoreEvaluationDetail_year_countryId_delete_idx" ON "ScoreEvaluationDetail"("year", "countryId", "delete");
