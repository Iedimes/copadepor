-- ============================================
-- SCRIPT PARA CORREGIR LA BASE DE DATOS
-- Ejecuta este script completo en phpMyAdmin
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. CREAR TABLA Tournament
-- ============================================
DROP TABLE IF EXISTS Tournament;

CREATE TABLE `Tournament` (
    `id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `sportType` ENUM('FUTBOL_11', 'FUTSAL', 'FUTBOL_7', 'FUTBOL_SALA', 'BALONMANO', 'BALONCESTO', 'VOLEY', 'VOLEY_PLAYA', 'TENIS_MESA', 'TENIS', 'BEACH_TENNIS', 'AJEDREZ', 'ATLETISMO', 'DEPORTE_GENERICO', 'DISPAROS', 'BATTLE_ROYALE', 'MOBA_LOL', 'MOBA_DOTA') NOT NULL,
    `status` ENUM('DRAFT', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `format` VARCHAR(255) NOT NULL DEFAULT 'liga',
    `startDate` DATETIME NOT NULL,
    `endDate` DATETIME,
    `registrationEnd` DATETIME,
    `maxTeams` INT NOT NULL DEFAULT 16,
    `minPlayers` INT NOT NULL DEFAULT 7,
    `maxPlayersPerTeam` INT NOT NULL DEFAULT 22,
    `logo` VARCHAR(255),
    `banner` VARCHAR(255),
    `customUrl` VARCHAR(255),
    `plan` ENUM('PEQUENO', 'INTERMEDIARIO', 'GRANDE', 'PROFESIONAL') NOT NULL DEFAULT 'PEQUENO',
    `maxPlayersLimit` INT NOT NULL DEFAULT 300,
    `maxSponsors` INT NOT NULL DEFAULT 3,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `organizerId` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `Tournament_organizerId_idx`(`organizerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 2. CREAR TABLA Category
-- ============================================
DROP TABLE IF EXISTS Category;

CREATE TABLE `Category` (
    `id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `minAge` INT,
    `maxAge` INT,
    `tournamentId` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`),
    INDEX `Category_tournamentId_idx`(`tournamentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 3. CREAR TABLA Match
-- ============================================
DROP TABLE IF EXISTS Match;

CREATE TABLE `Match` (
    `id` VARCHAR(255) NOT NULL,
    `tournamentId` VARCHAR(255) NOT NULL,
    `categoryId` VARCHAR(255),
    `homeTeamId` VARCHAR(255) NOT NULL,
    `awayTeamId` VARCHAR(255) NOT NULL,
    `homeScore` INT,
    `awayScore` INT,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `matchDate` DATETIME NOT NULL,
    `roundName` VARCHAR(255) NOT NULL DEFAULT '1ª Fecha',
    `location` VARCHAR(255),
    `referee` VARCHAR(255),
    `notes` TEXT,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `Match_tournamentId_idx`(`tournamentId`),
    INDEX `Match_homeTeamId_idx`(`homeTeamId`),
    INDEX `Match_awayTeamId_idx`(`awayTeamId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 4. CREAR TABLA Standings
-- ============================================
DROP TABLE IF EXISTS Standings;

CREATE TABLE `Standings` (
    `id` VARCHAR(255) NOT NULL,
    `categoryId` VARCHAR(255) NOT NULL,
    `teamId` VARCHAR(255) NOT NULL,
    `played` INT NOT NULL DEFAULT 0,
    `won` INT NOT NULL DEFAULT 0,
    `drawn` INT NOT NULL DEFAULT 0,
    `lost` INT NOT NULL DEFAULT 0,
    `goalsFor` INT NOT NULL DEFAULT 0,
    `goalsAgainst` INT NOT NULL DEFAULT 0,
    `points` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `Standings_category_team_idx`(`categoryId`, `teamId`),
    INDEX `Standings_teamId_idx`(`teamId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 5. CREAR TABLA Sponsor
-- ============================================
DROP TABLE IF EXISTS Sponsor;

CREATE TABLE `Sponsor` (
    `id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `logo` VARCHAR(255),
    `website` VARCHAR(255),
    `tier` VARCHAR(255) NOT NULL DEFAULT 'bronze',
    `tournamentId` VARCHAR(255) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `Sponsor_tournamentId_idx`(`tournamentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 6. CREAR TABLA News
-- ============================================
DROP TABLE IF EXISTS News;

CREATE TABLE `News` (
    `id` VARCHAR(255) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `image` VARCHAR(255),
    `tournamentId` VARCHAR(255) NOT NULL,
    `publishedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (`id`),
    INDEX `News_tournamentId_idx`(`tournamentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 7. CREAR TABLA Message
-- ============================================
DROP TABLE IF EXISTS Message;

CREATE TABLE `Message` (
    `id` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `tournamentId` VARCHAR(255),
    `senderId` VARCHAR(255) NOT NULL,
    `receiverId` VARCHAR(255) NOT NULL,
    `teamId` VARCHAR(255),
    `isRead` BOOLEAN NOT NULL DEFAULT FALSE,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `Message_senderId_idx`(`senderId`),
    INDEX `Message_receiverId_idx`(`receiverId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 8. CREAR TABLA Settings
-- ============================================
DROP TABLE IF EXISTS Settings;

CREATE TABLE `Settings` (
    `id` VARCHAR(255) NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `Settings_key_idx`(`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICAR QUE TODO ESTÁ CORRECTO
-- ============================================
SHOW TABLES;