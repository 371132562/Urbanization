-- DropIndex
DROP INDEX "Continent_enName_idx";

-- DropIndex
DROP INDEX "Continent_cnName_idx";

-- DropIndex
DROP INDEX "Country_enName_idx";

-- DropIndex
DROP INDEX "Country_cnName_idx";

-- DropIndex
DROP INDEX "DetailedIndicator_indicatorEnName_idx";

-- DropIndex
DROP INDEX "DetailedIndicator_indicatorCnName_idx";

-- DropIndex
DROP INDEX "SecondaryIndicator_indicatorEnName_idx";

-- DropIndex
DROP INDEX "SecondaryIndicator_indicatorCnName_idx";

-- DropIndex
DROP INDEX "TopIndicator_indicatorEnName_idx";

-- DropIndex
DROP INDEX "TopIndicator_indicatorCnName_idx";

-- DropIndex
DROP INDEX "UrbanizationWorldMap_countryId_idx";

-- CreateIndex
CREATE INDEX "Continent_cnName_delete_idx" ON "Continent"("cnName", "delete");

-- CreateIndex
CREATE INDEX "Continent_enName_delete_idx" ON "Continent"("enName", "delete");

-- CreateIndex
CREATE INDEX "Country_cnName_delete_idx" ON "Country"("cnName", "delete");

-- CreateIndex
CREATE INDEX "Country_enName_delete_idx" ON "Country"("enName", "delete");

-- CreateIndex
CREATE INDEX "DetailedIndicator_indicatorCnName_delete_idx" ON "DetailedIndicator"("indicatorCnName", "delete");

-- CreateIndex
CREATE INDEX "DetailedIndicator_indicatorEnName_delete_idx" ON "DetailedIndicator"("indicatorEnName", "delete");

-- CreateIndex
CREATE INDEX "IndicatorValue_countryId_year_delete_idx" ON "IndicatorValue"("countryId", "year", "delete");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_indicatorCnName_delete_idx" ON "SecondaryIndicator"("indicatorCnName", "delete");

-- CreateIndex
CREATE INDEX "SecondaryIndicator_indicatorEnName_delete_idx" ON "SecondaryIndicator"("indicatorEnName", "delete");

-- CreateIndex
CREATE INDEX "TopIndicator_indicatorCnName_delete_idx" ON "TopIndicator"("indicatorCnName", "delete");

-- CreateIndex
CREATE INDEX "TopIndicator_indicatorEnName_delete_idx" ON "TopIndicator"("indicatorEnName", "delete");

-- CreateIndex
CREATE INDEX "UrbanizationWorldMap_countryId_delete_idx" ON "UrbanizationWorldMap"("countryId", "delete");
