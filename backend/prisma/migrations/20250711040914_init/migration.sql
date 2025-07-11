-- CreateTable
CREATE TABLE "Continent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnName" TEXT NOT NULL,
    "enName" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnName" TEXT NOT NULL,
    "enName" TEXT NOT NULL,
    "continentId" TEXT NOT NULL,
    CONSTRAINT "Country_continentId_fkey" FOREIGN KEY ("continentId") REFERENCES "Continent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TopIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorCnName" TEXT NOT NULL,
    "indicatorEsName" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL NOT NULL
);

-- CreateTable
CREATE TABLE "SecondaryIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorCnName" TEXT NOT NULL,
    "indicatorEsName" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL NOT NULL,
    "topIndicatorId" TEXT NOT NULL,
    CONSTRAINT "SecondaryIndicator_topIndicatorId_fkey" FOREIGN KEY ("topIndicatorId") REFERENCES "TopIndicator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetailedIndicator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicatorCnName" TEXT NOT NULL,
    "indicatorEsName" TEXT NOT NULL,
    "description" TEXT,
    "weight" DECIMAL NOT NULL,
    "secondaryIndicatorId" TEXT NOT NULL,
    CONSTRAINT "DetailedIndicator_secondaryIndicatorId_fkey" FOREIGN KEY ("secondaryIndicatorId") REFERENCES "SecondaryIndicator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UrbanizationWorldMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countryId" TEXT NOT NULL,
    "urbanization" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "UrbanizationWorldMap_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "delete" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "Continent_id_idx" ON "Continent"("id");

-- CreateIndex
CREATE INDEX "Continent_cnName_idx" ON "Continent"("cnName");

-- CreateIndex
CREATE INDEX "Continent_enName_idx" ON "Continent"("enName");

-- CreateIndex
CREATE INDEX "Country_id_idx" ON "Country"("id");

-- CreateIndex
CREATE INDEX "Country_cnName_idx" ON "Country"("cnName");

-- CreateIndex
CREATE INDEX "Country_enName_idx" ON "Country"("enName");

-- CreateIndex
CREATE INDEX "TopIndicator_id_idx" ON "TopIndicator"("id");

-- CreateIndex
CREATE INDEX "TopIndicator_indicatorCnName_idx" ON "TopIndicator"("indicatorCnName");

-- CreateIndex
CREATE INDEX "TopIndicator_indicatorEsName_idx" ON "TopIndicator"("indicatorEsName");

-- CreateIndex
CREATE INDEX "TopIndicator_weight_idx" ON "TopIndicator"("weight");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_id_idx" ON "SecondaryIndicator"("id");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_indicatorCnName_idx" ON "SecondaryIndicator"("indicatorCnName");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_indicatorEsName_idx" ON "SecondaryIndicator"("indicatorEsName");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_weight_idx" ON "SecondaryIndicator"("weight");

-- CreateIndex
CREATE INDEX "DetailedIndicator_id_idx" ON "DetailedIndicator"("id");

-- CreateIndex
CREATE INDEX "DetailedIndicator_indicatorCnName_idx" ON "DetailedIndicator"("indicatorCnName");

-- CreateIndex
CREATE INDEX "DetailedIndicator_indicatorEsName_idx" ON "DetailedIndicator"("indicatorEsName");

-- CreateIndex
CREATE INDEX "DetailedIndicator_weight_idx" ON "DetailedIndicator"("weight");
