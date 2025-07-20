-- CreateTable
CREATE TABLE "Continent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnName" TEXT NOT NULL,
    "enName" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnName" TEXT NOT NULL,
    "enName" TEXT NOT NULL,
    "continentId" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Country_continentId_fkey" FOREIGN KEY ("continentId") REFERENCES "Continent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TopIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorCnName" TEXT NOT NULL,
    "indicatorEnName" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "SecondaryIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorCnName" TEXT NOT NULL,
    "indicatorEnName" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL NOT NULL,
    "topIndicatorId" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SecondaryIndicator_topIndicatorId_fkey" FOREIGN KEY ("topIndicatorId") REFERENCES "TopIndicator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetailedIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorCnName" TEXT NOT NULL,
    "indicatorEnName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL NOT NULL,
    "secondaryIndicatorId" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DetailedIndicator_secondaryIndicatorId_fkey" FOREIGN KEY ("secondaryIndicatorId") REFERENCES "SecondaryIndicator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IndicatorValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" DECIMAL,
    "year" DATETIME NOT NULL,
    "countryId" TEXT NOT NULL,
    "detailedIndicatorId" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "IndicatorValue_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IndicatorValue_detailedIndicatorId_fkey" FOREIGN KEY ("detailedIndicatorId") REFERENCES "DetailedIndicator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UrbanizationWorldMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "urbanization" BOOLEAN NOT NULL DEFAULT false,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UrbanizationWorldMap_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "ArticleOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" TEXT NOT NULL,
    "articles" JSONB NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalScore" DECIMAL NOT NULL,
    "urbanizationProcessDimensionScore" DECIMAL NOT NULL,
    "humanDynamicsDimensionScore" DECIMAL NOT NULL,
    "materialDynamicsDimensionScore" DECIMAL NOT NULL,
    "spatialDynamicsDimensionScore" DECIMAL NOT NULL,
    "year" DATETIME NOT NULL,
    "countryId" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Score_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoreEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minScore" DECIMAL NOT NULL,
    "maxScore" DECIMAL NOT NULL,
    "evaluationText" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Continent_cnName_key" ON "Continent"("cnName");

-- CreateIndex
CREATE UNIQUE INDEX "Continent_enName_key" ON "Continent"("enName");

-- CreateIndex
CREATE INDEX "Continent_id_idx" ON "Continent"("id");

-- CreateIndex
CREATE INDEX "Continent_cnName_delete_idx" ON "Continent"("cnName", "delete");

-- CreateIndex
CREATE INDEX "Continent_enName_delete_idx" ON "Continent"("enName", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "Country_cnName_key" ON "Country"("cnName");

-- CreateIndex
CREATE UNIQUE INDEX "Country_enName_key" ON "Country"("enName");

-- CreateIndex
CREATE INDEX "Country_id_idx" ON "Country"("id");

-- CreateIndex
CREATE INDEX "Country_cnName_delete_idx" ON "Country"("cnName", "delete");

-- CreateIndex
CREATE INDEX "Country_enName_delete_idx" ON "Country"("enName", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "TopIndicator_indicatorCnName_key" ON "TopIndicator"("indicatorCnName");

-- CreateIndex
CREATE UNIQUE INDEX "TopIndicator_indicatorEnName_key" ON "TopIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "TopIndicator_id_idx" ON "TopIndicator"("id");

-- CreateIndex
CREATE INDEX "TopIndicator_indicatorCnName_delete_idx" ON "TopIndicator"("indicatorCnName", "delete");

-- CreateIndex
CREATE INDEX "TopIndicator_indicatorEnName_delete_idx" ON "TopIndicator"("indicatorEnName", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryIndicator_indicatorCnName_key" ON "SecondaryIndicator"("indicatorCnName");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryIndicator_indicatorEnName_key" ON "SecondaryIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_id_idx" ON "SecondaryIndicator"("id");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_indicatorCnName_delete_idx" ON "SecondaryIndicator"("indicatorCnName", "delete");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_indicatorEnName_delete_idx" ON "SecondaryIndicator"("indicatorEnName", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "DetailedIndicator_indicatorCnName_key" ON "DetailedIndicator"("indicatorCnName");

-- CreateIndex
CREATE UNIQUE INDEX "DetailedIndicator_indicatorEnName_key" ON "DetailedIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "DetailedIndicator_id_idx" ON "DetailedIndicator"("id");

-- CreateIndex
CREATE INDEX "DetailedIndicator_indicatorCnName_delete_idx" ON "DetailedIndicator"("indicatorCnName", "delete");

-- CreateIndex
CREATE INDEX "DetailedIndicator_indicatorEnName_delete_idx" ON "DetailedIndicator"("indicatorEnName", "delete");

-- CreateIndex
CREATE INDEX "IndicatorValue_countryId_year_idx" ON "IndicatorValue"("countryId", "year");

-- CreateIndex
CREATE INDEX "IndicatorValue_countryId_year_delete_idx" ON "IndicatorValue"("countryId", "year", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "UrbanizationWorldMap_countryId_key" ON "UrbanizationWorldMap"("countryId");

-- CreateIndex
CREATE INDEX "UrbanizationWorldMap_id_idx" ON "UrbanizationWorldMap"("id");

-- CreateIndex
CREATE INDEX "UrbanizationWorldMap_countryId_delete_idx" ON "UrbanizationWorldMap"("countryId", "delete");

-- CreateIndex
CREATE INDEX "Article_id_delete_idx" ON "Article"("id", "delete");

-- CreateIndex
CREATE INDEX "ArticleOrder_page_delete_idx" ON "ArticleOrder"("page", "delete");

-- CreateIndex
CREATE INDEX "Score_year_countryId_delete_idx" ON "Score"("year", "countryId", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "Image_filename_key" ON "Image"("filename");

-- CreateIndex
CREATE INDEX "Image_id_delete_idx" ON "Image"("id", "delete");

-- CreateIndex
CREATE UNIQUE INDEX "Image_hash_delete_key" ON "Image"("hash", "delete");
