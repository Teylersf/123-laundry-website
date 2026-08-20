CREATE TABLE "web_analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "isLanding" BOOLEAN NOT NULL DEFAULT false,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "referrerHost" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "country" TEXT,
    "deviceCategory" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "operatingSystem" TEXT NOT NULL,
    "screenWidth" INTEGER,

    CONSTRAINT "web_analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "web_analytics_events_eventId_key"
ON "web_analytics_events"("eventId");

CREATE INDEX "web_analytics_events_occurredAt_idx"
ON "web_analytics_events"("occurredAt");

CREATE INDEX "web_analytics_events_path_occurredAt_idx"
ON "web_analytics_events"("path", "occurredAt");

CREATE INDEX "web_analytics_events_sessionId_occurredAt_idx"
ON "web_analytics_events"("sessionId", "occurredAt");

CREATE INDEX "web_analytics_events_visitorId_occurredAt_idx"
ON "web_analytics_events"("visitorId", "occurredAt");

CREATE INDEX "web_analytics_events_referrerHost_occurredAt_idx"
ON "web_analytics_events"("referrerHost", "occurredAt");

CREATE INDEX "web_analytics_events_country_occurredAt_idx"
ON "web_analytics_events"("country", "occurredAt");

CREATE INDEX "web_analytics_events_deviceCategory_occurredAt_idx"
ON "web_analytics_events"("deviceCategory", "occurredAt");
