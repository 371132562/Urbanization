-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScoreEvaluationDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "countryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT [],
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ScoreEvaluationDetail_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ScoreEvaluationDetail" ("countryId", "createTime", "delete", "id", "text", "updateTime", "year") SELECT "countryId", "createTime", "delete", "id", "text", "updateTime", "year" FROM "ScoreEvaluationDetail";
DROP TABLE "ScoreEvaluationDetail";
ALTER TABLE "new_ScoreEvaluationDetail" RENAME TO "ScoreEvaluationDetail";
CREATE INDEX "ScoreEvaluationDetail_year_countryId_idx" ON "ScoreEvaluationDetail"("year", "countryId");
CREATE INDEX "ScoreEvaluationDetail_year_countryId_delete_idx" ON "ScoreEvaluationDetail"("year", "countryId", "delete");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
