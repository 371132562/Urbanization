-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT [],
    "type" TEXT NOT NULL DEFAULT 'ARTICLE',
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Article" ("content", "createTime", "delete", "id", "images", "title", "updateTime") SELECT "content", "createTime", "delete", "id", "images", "title", "updateTime" FROM "Article";
DROP TABLE "Article";
ALTER TABLE "new_Article" RENAME TO "Article";
CREATE INDEX "Article_id_delete_idx" ON "Article"("id", "delete");
CREATE TABLE "new_ArticleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" TEXT NOT NULL,
    "articles" JSONB NOT NULL DEFAULT [],
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_ArticleOrder" ("articles", "createTime", "delete", "id", "page", "updateTime") SELECT "articles", "createTime", "delete", "id", "page", "updateTime" FROM "ArticleOrder";
DROP TABLE "ArticleOrder";
ALTER TABLE "new_ArticleOrder" RENAME TO "ArticleOrder";
CREATE INDEX "ArticleOrder_page_delete_idx" ON "ArticleOrder"("page", "delete");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
