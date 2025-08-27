-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScoreEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minScore" DECIMAL NOT NULL,
    "maxScore" DECIMAL NOT NULL,
    "evaluationText" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT [],
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL
);
INSERT INTO "new_ScoreEvaluation" ("createTime", "evaluationText", "id", "maxScore", "minScore", "updateTime") SELECT "createTime", "evaluationText", "id", "maxScore", "minScore", "updateTime" FROM "ScoreEvaluation";
DROP TABLE "ScoreEvaluation";
ALTER TABLE "new_ScoreEvaluation" RENAME TO "ScoreEvaluation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
