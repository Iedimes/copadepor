-- ============================================
-- COPADEPOR - ESTRUCTURA COMPLETA DE BASE DE DATOS
-- Ejecuta este script en phpMyAdmin para crear/actualizar la estructura
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- ELIMINAR TABLAS EXISTENTES (en orden inverso por foreign keys)
-- ============================================
DROP TABLE IF EXISTS message;
DROP TABLE IF EXISTS news;
DROP TABLE IF EXISTS sponsor;
DROP TABLE IF EXISTS sanction;
DROP TABLE IF EXISTS goal;
DROP TABLE IF EXISTS matchreport;
DROP TABLE IF EXISTS standings;
DROP TABLE IF EXISTS match;
DROP TABLE IF EXISTS tournamentteam;
DROP TABLE IF EXISTS category;
DROP TABLE IF EXISTS playerprofile;
DROP TABLE IF EXISTS teamplayer;
DROP TABLE IF EXISTS teammember;
DROP TABLE IF EXISTS team;
DROP TABLE IF EXISTS tournament;
DROP TABLE IF EXISTS settings;

-- ============================================
-- CREAR TABLAS
-- ============================================

-- 1. Settings
CREATE TABLE settings (
    id VARCHAR(30) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX settings_key_key (key)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Tournament
CREATE TABLE tournament (
    id VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sportType ENUM('FUTBOL_11', 'FUTSAL', 'FUTBOL_7', 'FUTBOL_SALA', 'BALONMANO', 'BALONCESTO', 'VOLEY', 'VOLEY_PLAYA', 'TENIS_MESA', 'TENIS', 'BEACH_TENNIS', 'AJEDREZ', 'ATLETISMO', 'DEPORTE_GENERICO', 'DISPAROS', 'BATTLE_ROYALE', 'MOBA_LOL', 'MOBA_DOTA') NOT NULL,
    status ENUM('DRAFT', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    format VARCHAR(255) NOT NULL DEFAULT 'liga',
    startDate DATETIME NOT NULL,
    endDate DATETIME NOT NULL,
    registrationEnd DATETIME,
    maxTeams INT NOT NULL DEFAULT 16,
    minPlayers INT NOT NULL DEFAULT 7,
    maxPlayersPerTeam INT NOT NULL DEFAULT 22,
    logo VARCHAR(255),
    banner VARCHAR(255),
    customUrl VARCHAR(255),
    plan ENUM('PEQUENO', 'INTERMEDIARIO', 'GRANDE', 'PROFESIONAL') NOT NULL DEFAULT 'PEQUENO',
    maxPlayersLimit INT NOT NULL DEFAULT 300,
    maxSponsors INT NOT NULL DEFAULT 3,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    organizerId VARCHAR(30) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. Category
CREATE TABLE category (
    id VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    minAge INT,
    maxAge INT,
    tournamentId VARCHAR(30) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Team
CREATE TABLE team (
    id VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(255),
    color VARCHAR(255),
    coach VARCHAR(255),
    managerId VARCHAR(30) NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. TournamentTeam
CREATE TABLE tournamentteam (
    id VARCHAR(30) NOT NULL,
    tournamentId VARCHAR(30) NOT NULL,
    teamId VARCHAR(30) NOT NULL,
    registeredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(255) NOT NULL DEFAULT 'active',
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 6. TeamMember
CREATE TABLE teammember (
    id VARCHAR(30) NOT NULL,
    teamId VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('PLAYER', 'COACH', 'ASSISTANT', 'TECHNICAL') NOT NULL DEFAULT 'PLAYER',
    number INT,
    phone VARCHAR(255),
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 7. PlayerProfile
CREATE TABLE playerprofile (
    id VARCHAR(30) NOT NULL,
    userId VARCHAR(30) NOT NULL,
    dni VARCHAR(255) NOT NULL,
    dateOfBirth DATETIME NOT NULL,
    nationality VARCHAR(255),
    position VARCHAR(255),
    photo VARCHAR(255),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX playerprofile_dni_key (dni),
    UNIQUE INDEX playerprofile_userId_key (userId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 8. TeamPlayer
CREATE TABLE teamplayer (
    id VARCHAR(30) NOT NULL,
    teamId VARCHAR(30) NOT NULL,
    playerId VARCHAR(30) NOT NULL,
    number INT,
    isCaptain BOOLEAN NOT NULL DEFAULT FALSE,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 9. Match
CREATE TABLE match (
    id VARCHAR(30) NOT NULL,
    tournamentId VARCHAR(30) NOT NULL,
    categoryId VARCHAR(30),
    homeTeamId VARCHAR(30) NOT NULL,
    awayTeamId VARCHAR(30) NOT NULL,
    homeScore INT,
    awayScore INT,
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    matchDate DATETIME NOT NULL,
    roundName VARCHAR(255) NOT NULL DEFAULT '1ª Fecha',
    location VARCHAR(255),
    referee VARCHAR(255),
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 10. Goal
CREATE TABLE goal (
    id VARCHAR(30) NOT NULL,
    matchId VARCHAR(30) NOT NULL,
    playerId VARCHAR(30) NOT NULL,
    teamId VARCHAR(30) NOT NULL,
    isOwnGoal BOOLEAN NOT NULL DEFAULT FALSE,
    minute INT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 11. MatchReport
CREATE TABLE matchreport (
    id VARCHAR(30) NOT NULL,
    matchId VARCHAR(30) NOT NULL,
    summary TEXT,
    incidents TEXT,
    attendance INT,
    weather VARCHAR(255),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX matchreport_matchId_key (matchId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 12. Standings
CREATE TABLE standings (
    id VARCHAR(30) NOT NULL,
    categoryId VARCHAR(30) NOT NULL,
    teamId VARCHAR(30) NOT NULL,
    played INT NOT NULL DEFAULT 0,
    won INT NOT NULL DEFAULT 0,
    drawn INT NOT NULL DEFAULT 0,
    lost INT NOT NULL DEFAULT 0,
    goalsFor INT NOT NULL DEFAULT 0,
    goalsAgainst INT NOT NULL DEFAULT 0,
    points INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE INDEX standings_category_team_key (categoryId, teamId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 13. Sanction
CREATE TABLE sanction (
    id VARCHAR(30) NOT NULL,
    playerId VARCHAR(30) NOT NULL,
    type VARCHAR(255) NOT NULL,
    reason TEXT,
    startDate DATETIME NOT NULL,
    endDate DATETIME,
    matches INT,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 14. Sponsor
CREATE TABLE sponsor (
    id VARCHAR(30) NOT NULL,
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(255),
    website VARCHAR(255),
    tier VARCHAR(255) NOT NULL DEFAULT 'bronze',
    tournamentId VARCHAR(30) NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 15. News
CREATE TABLE news (
    id VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image VARCHAR(255),
    tournamentId VARCHAR(30) NOT NULL,
    publishedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 16. Message
CREATE TABLE message (
    id VARCHAR(30) NOT NULL,
    content TEXT NOT NULL,
    tournamentId VARCHAR(30),
    senderId VARCHAR(30) NOT NULL,
    receiverId VARCHAR(30) NOT NULL,
    teamId VARCHAR(30),
    isRead BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICAR ESTRUCTURA
-- ============================================
SHOW TABLES;

-- Verificar count de tablas
SELECT 'tournament' as tabla, COUNT(*) as registros FROM tournament
UNION ALL SELECT 'category', COUNT(*) FROM category
UNION ALL SELECT 'team', COUNT(*) FROM team
UNION ALL SELECT 'match', COUNT(*) FROM match
UNION ALL SELECT 'standings', COUNT(*) FROM standings
UNION ALL SELECT 'sponsor', COUNT(*) FROM sponsor
UNION ALL SELECT 'news', COUNT(*) FROM news
UNION ALL SELECT 'message', COUNT(*) FROM message
UNION ALL SELECT 'user', COUNT(*) FROM user;