-- Migración para crear la tabla de actividades
CREATE TABLE IF NOT EXISTS user_activities (
    id SERIAL PRIMARY KEY,
    strava_activity_id BIGINT UNIQUE NOT NULL,
    athlete_id BIGINT NOT NULL REFERENCES strava_tokens(athlete_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sport_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    distance FLOAT NOT NULL, -- en metros
    moving_time INTEGER NOT NULL, -- en segundos
    elapsed_time INTEGER NOT NULL, -- en segundos
    total_elevation_gain FLOAT, -- en metros
    has_heartrate BOOLEAN DEFAULT false,
    average_heartrate FLOAT,
    max_heartrate FLOAT,
    average_speed FLOAT, -- en metros por segundo
    max_speed FLOAT, -- en metros por segundo
    average_watts FLOAT,
    max_watts FLOAT,
    weighted_average_watts FLOAT,
    kilojoules FLOAT,
    average_cadence FLOAT,
    suffer_score INTEGER, -- relative effort
    calories FLOAT,
    -- Métricas calculadas por nosotros
    elevation_ratio FLOAT, -- metros de elevación por km (total_elevation_gain / distance * 1000)
    tss FLOAT, -- Training Stress Score
    intensity_factor FLOAT, -- IF
    normalized_power FLOAT, -- NP
    vam FLOAT, -- Velocidad de Ascenso Media
    -- Datos de tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_athlete FOREIGN KEY(athlete_id) REFERENCES strava_tokens(athlete_id)
);

-- Índice para búsquedas rápidas por atleta y rango de fechas
CREATE INDEX IF NOT EXISTS idx_user_activities_athlete_date ON user_activities(athlete_id, start_date);

-- Índice para búsquedas por tipo de deporte
CREATE INDEX IF NOT EXISTS idx_user_activities_sport_type ON user_activities(athlete_id, sport_type);

-- Función para actualizar el timestamp de update automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente updated_at
CREATE TRIGGER update_user_activities_updated_at
BEFORE UPDATE ON user_activities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 