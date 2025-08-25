-- CreateIndex
CREATE INDEX "IndicatorValue_detailedIndicatorId_year_countryId_idx" ON "IndicatorValue"("detailedIndicatorId", "year", "countryId");

-- CreateIndex
CREATE INDEX "IndicatorValue_detailedIndicatorId_year_countryId_delete_idx" ON "IndicatorValue"("detailedIndicatorId", "year", "countryId", "delete");
