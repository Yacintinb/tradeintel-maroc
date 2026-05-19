-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CLIENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('CSV', 'XLSX', 'REST_API', 'CKAN_API', 'MANUAL');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'DRAFT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('IMPORT', 'EXPORT');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('TRES_INTERESSANT', 'INTERESSANT', 'A_SURVEILLER', 'FAIBLE_POTENTIEL', 'RISQUE');

-- CreateEnum
CREATE TYPE "MarginPotential" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RegulatoryRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PRODUCT', 'SECTOR', 'EXCEL_EXPORT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED', 'TRIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "url" TEXT,
    "license" TEXT,
    "refreshFrequency" TEXT,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataIngestionJob" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "rowsImported" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataIngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeFlow" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "flowType" "FlowType" NOT NULL,
    "hsCode" TEXT NOT NULL,
    "productLabel" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "valueMad" DECIMAL(18,2) NOT NULL,
    "quantity" DECIMAL(18,3),
    "unit" TEXT,
    "sourceFile" TEXT,
    "dataSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "subCategory" TEXT,
    "keywords" TEXT[],
    "regulatoryRisk" "RegulatoryRisk" NOT NULL DEFAULT 'UNKNOWN',
    "marginPotential" "MarginPotential" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityScore" (
    "id" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "marketSizeScore" DOUBLE PRECISION NOT NULL,
    "growthScore" DOUBLE PRECISION NOT NULL,
    "stabilityScore" DOUBLE PRECISION NOT NULL,
    "supplierDiversityScore" DOUBLE PRECISION NOT NULL,
    "marginScore" DOUBLE PRECISION NOT NULL,
    "regulatoryScore" DOUBLE PRECISION NOT NULL,
    "customsRiskScore" DOUBLE PRECISION NOT NULL,
    "fxRiskScore" DOUBLE PRECISION NOT NULL,
    "dataQualityScore" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "recommendation" "Recommendation" NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "sector" TEXT,
    "hsCode" TEXT,
    "description" TEXT,
    "fileUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "rateMad" DECIMAL(18,6) NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomsTariff" (
    "id" TEXT NOT NULL,
    "hsCode10" TEXT NOT NULL,
    "hsCode6" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapter" TEXT,
    "section" TEXT,
    "dutyRate" DOUBLE PRECISION,
    "vatRate" DOUBLE PRECISION,
    "parafiscalTax" DOUBLE PRECISION,
    "source" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomsTariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MacroIndicator" (
    "id" TEXT NOT NULL,
    "indicatorName" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MacroIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenDataset" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organization" TEXT,
    "format" TEXT,
    "url" TEXT,
    "lastModified" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "maxReports" INTEGER NOT NULL,
    "canExportExcel" BOOLEAN NOT NULL DEFAULT false,
    "canExportPdf" BOOLEAN NOT NULL DEFAULT false,
    "canAccessApi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TradeFlow_hsCode_year_flowType_idx" ON "TradeFlow"("hsCode", "year", "flowType");

-- CreateIndex
CREATE INDEX "TradeFlow_country_idx" ON "TradeFlow"("country");

-- CreateIndex
CREATE UNIQUE INDEX "Product_hsCode_key" ON "Product"("hsCode");

-- CreateIndex
CREATE INDEX "OpportunityScore_finalScore_idx" ON "OpportunityScore"("finalScore");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityScore_hsCode_year_key" ON "OpportunityScore"("hsCode", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_date_currency_source_key" ON "ExchangeRate"("date", "currency", "source");

-- CreateIndex
CREATE UNIQUE INDEX "CustomsTariff_hsCode10_key" ON "CustomsTariff"("hsCode10");

-- CreateIndex
CREATE INDEX "CustomsTariff_hsCode6_idx" ON "CustomsTariff"("hsCode6");

-- CreateIndex
CREATE UNIQUE INDEX "OpenDataset_source_datasetId_key" ON "OpenDataset"("source", "datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- AddForeignKey
ALTER TABLE "DataIngestionJob" ADD CONSTRAINT "DataIngestionJob_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeFlow" ADD CONSTRAINT "TradeFlow_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSubscription" ADD CONSTRAINT "ClientSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSubscription" ADD CONSTRAINT "ClientSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
