-- CreateTable
CREATE TABLE "Continent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnName" TEXT NOT NULL,
    "enName" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnName" TEXT NOT NULL,
    "enName" TEXT NOT NULL,
    "continentId" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL,
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
    "updateTime" DATETIME NOT NULL
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
    CONSTRAINT "UrbanizationWorldMap_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Continent_cnName_key" ON "Continent"("cnName");

-- CreateIndex
CREATE UNIQUE INDEX "Continent_enName_key" ON "Continent"("enName");

-- CreateIndex
CREATE INDEX "Continent_id_idx" ON "Continent"("id");

-- CreateIndex
CREATE INDEX "Continent_cnName_idx" ON "Continent"("cnName");

-- CreateIndex
CREATE INDEX "Continent_enName_idx" ON "Continent"("enName");

-- CreateIndex
CREATE UNIQUE INDEX "Country_cnName_key" ON "Country"("cnName");

-- CreateIndex
CREATE UNIQUE INDEX "Country_enName_key" ON "Country"("enName");

-- CreateIndex
CREATE INDEX "Country_id_idx" ON "Country"("id");

-- CreateIndex
CREATE INDEX "Country_cnName_idx" ON "Country"("cnName");

-- CreateIndex
CREATE INDEX "Country_enName_idx" ON "Country"("enName");

-- CreateIndex
CREATE UNIQUE INDEX "TopIndicator_indicatorCnName_key" ON "TopIndicator"("indicatorCnName");

-- CreateIndex
CREATE UNIQUE INDEX "TopIndicator_indicatorEnName_key" ON "TopIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "TopIndicator_id_idx" ON "TopIndicator"("id");

-- CreateIndex
CREATE INDEX "TopIndicator_indicatorCnName_idx" ON "TopIndicator"("indicatorCnName");

-- CreateIndex
CREATE INDEX "TopIndicator_indicatorEnName_idx" ON "TopIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "TopIndicator_weight_idx" ON "TopIndicator"("weight");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryIndicator_indicatorCnName_key" ON "SecondaryIndicator"("indicatorCnName");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryIndicator_indicatorEnName_key" ON "SecondaryIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_id_idx" ON "SecondaryIndicator"("id");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_indicatorCnName_idx" ON "SecondaryIndicator"("indicatorCnName");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_indicatorEnName_idx" ON "SecondaryIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_weight_idx" ON "SecondaryIndicator"("weight");

-- CreateIndex
CREATE UNIQUE INDEX "DetailedIndicator_indicatorCnName_key" ON "DetailedIndicator"("indicatorCnName");

-- CreateIndex
CREATE UNIQUE INDEX "DetailedIndicator_indicatorEnName_key" ON "DetailedIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "DetailedIndicator_id_idx" ON "DetailedIndicator"("id");

-- CreateIndex
CREATE INDEX "DetailedIndicator_indicatorCnName_idx" ON "DetailedIndicator"("indicatorCnName");

-- CreateIndex
CREATE INDEX "DetailedIndicator_indicatorEnName_idx" ON "DetailedIndicator"("indicatorEnName");

-- CreateIndex
CREATE INDEX "DetailedIndicator_weight_idx" ON "DetailedIndicator"("weight");

-- CreateIndex
CREATE INDEX "IndicatorValue_countryId_year_idx" ON "IndicatorValue"("countryId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "IndicatorValue_countryId_year_detailedIndicatorId_key" ON "IndicatorValue"("countryId", "year", "detailedIndicatorId");

-- CreateIndex
CREATE UNIQUE INDEX "UrbanizationWorldMap_countryId_key" ON "UrbanizationWorldMap"("countryId");
