CREATE TABLE IF NOT EXISTS "TermsAcceptance" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipApprox" TEXT,
  "sessionRecord" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TermsAcceptance_userId_idx" ON "TermsAcceptance"("userId");
CREATE INDEX IF NOT EXISTS "TermsAcceptance_acceptedAt_idx" ON "TermsAcceptance"("acceptedAt");
