-- Script para resetear TODOS los datos EXCEPTO la tabla User
-- Ejecuta este script en phpMyAdmin o MySQL CLI

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE MatchReport;
TRUNCATE TABLE Goal;
TRUNCATE TABLE Match;
TRUNCATE TABLE Standings;
TRUNCATE TABLE TeamPlayer;
TRUNCATE TABLE TournamentTeam;
TRUNCATE TABLE Sanction;
TRUNCATE TABLE Sponsor;
TRUNCATE TABLE News;
TRUNCATE TABLE Message;
TRUNCATE TABLE Category;
TRUNCATE TABLE Tournament;
TRUNCATE TABLE PlayerProfile;
TRUNCATE TABLE Team;
TRUNCATE TABLE Settings;

SET FOREIGN_KEY_CHECKS = 1;

-- Verificar que quedó limpio
SELECT 'Tabla' AS nombre, COUNT(*) AS registros FROM MatchReport
UNION ALL SELECT 'Goal', COUNT(*) FROM Goal
UNION ALL SELECT 'Match', COUNT(*) FROM Match
UNION ALL SELECT 'Standings', COUNT(*) FROM Standings
UNION ALL SELECT 'TeamPlayer', COUNT(*) FROM TeamPlayer
UNION ALL SELECT 'TournamentTeam', COUNT(*) FROM TournamentTeam
UNION ALL SELECT 'Sanction', COUNT(*) FROM Sanction
UNION ALL SELECT 'Sponsor', COUNT(*) FROM Sponsor
UNION ALL SELECT 'News', COUNT(*) FROM News
UNION ALL SELECT 'Message', COUNT(*) FROM Message
UNION ALL SELECT 'Category', COUNT(*) FROM Category
UNION ALL SELECT 'Tournament', COUNT(*) FROM Tournament
UNION ALL SELECT 'PlayerProfile', COUNT(*) FROM PlayerProfile
UNION ALL SELECT 'Team', COUNT(*) FROM Team
UNION ALL SELECT 'Settings', COUNT(*) FROM Settings
UNION ALL SELECT 'User', COUNT(*) FROM User;