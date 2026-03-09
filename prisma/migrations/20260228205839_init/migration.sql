-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iTunesId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "artworkUrl" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL,
    "trackViewUrl" TEXT,
    "likedAt" DATETIME,
    "dislikedAt" DATETIME,
    "skippedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Song_iTunesId_key" ON "Song"("iTunesId");
