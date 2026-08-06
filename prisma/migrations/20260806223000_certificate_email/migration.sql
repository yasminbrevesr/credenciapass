-- CreateTable
CREATE TABLE "CertificateEmail" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "sentById" TEXT,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificateEmail_participantId_createdAt_idx"
ON "CertificateEmail"("participantId", "createdAt");

-- CreateIndex
CREATE INDEX "CertificateEmail_status_createdAt_idx"
ON "CertificateEmail"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "CertificateEmail"
ADD CONSTRAINT "CertificateEmail_certificateId_fkey"
FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateEmail"
ADD CONSTRAINT "CertificateEmail_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateEmail"
ADD CONSTRAINT "CertificateEmail_sentById_fkey"
FOREIGN KEY ("sentById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
