# Prueba de cálculo de VAM y Ratio

Este directorio contiene scripts para probar la funcionalidad de cálculo de VAM (Velocidad de Ascenso Media) y ratio de elevación para actividades de carrera.

## Requisitos previos

1. Node.js instalado
2. Un token de acceso válido para la API de Strava
3. La aplicación ejecutándose en localhost:3000

## Obtener un token de acceso de Strava

1. Ve a [Strava Developer](https://developers.strava.com/) y crea una aplicación
2. Obtendrás un ID de cliente y un secreto de cliente
3. Autoriza tu aplicación y obtén un token de acceso

## Scripts disponibles

### 1. Listar actividades recientes

```bash
node list-activities.js "tu_token_de_acceso"
```

Este script mostrará tus actividades recientes en Strava, incluyendo ID, nombre, tipo, distancia y elevación.

### 2. Probar el webhook con una actividad específica

```bash
node test-webhook.js <ID_ACTIVIDAD> "tu_token_de_acceso" [ID_USUARIO]
```

Este script simulará un evento de webhook para una actividad específica, calculando el VAM y el ratio de elevación.

## Ejemplo de uso

1. Primero lista tus actividades recientes:

```bash
node list-activities.js "tu_token_de_acceso"
```

2. Elige una actividad de tipo TrailRun o Run con elevación positiva y anota su ID

3. Ejecuta el script de prueba con ese ID:

```bash
node test-webhook.js 12345678901 "tu_token_de_acceso"
```

4. El script procesará la actividad y mostrará el VAM y ratio calculados

5. Verifica la actividad en Strava para ver el comentario añadido

## Notas

- El VAM preciso se calcula únicamente para los segmentos de subida (pendiente > 2%)
- Solo se comentarán actividades de tipo TrailRun o Run con elevación positiva
- El VAM se incluirá en el comentario solo si supera el umbral mínimo de 500 m/h
- El ratio se incluirá en el comentario solo si supera el umbral mínimo de 10 m/km 