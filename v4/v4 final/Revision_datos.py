import matplotlib.pyplot as plt
import pandas as pd
import os

path = os.path.join('data', 'Work Productivity.csv')
df = pd.read_csv(path, sep=',', encoding='utf-8')

#print(df.shape)

print("--- PRIMERAS 20 FILAS ---")
print(df.head(20))
print("\n")

# 2. Resumen técnico: columnas, tipos de datos y recuento de valores no nulos
print("--- INFORMACIÓN DEL DATAFRAME ---")
print(df.info())
print("\n")

# 3. Detectar si faltan datos: muestra la cantidad exacta de valores nulos (NaN) por columna
print("--- DATOS FALTANTES POR COLUMNA ---")
print(df.isnull().sum())
print("\n")

# 4. Estadísticas matemáticas rápidas (promedio, min, max, cuartiles) para columnas numéricas
print("--- ESTADÍSTICAS DESCRIPTIVAS ---")
print(df.describe())
print("\n")

# Resumen de proporcion y cantidad de personas de cada pais
column = "Country"

resumen_paises = pd.DataFrame({
    'Cantidad': df[column].value_counts(),
    'Proporción (0-1)': df[column].value_counts(normalize=True),
    'Porcentaje (%)': df[column].value_counts(normalize=True) * 100
})

# Redondear los decimales para que se vea más limpio (opcional)
resumen_paises = resumen_paises.round(2)

print("--- DISTRIBUCIÓN POR PAÍS ---")
print(resumen_paises)

# 5. Saber el tamaño exacto: devuelve un texto con formato (filas, columnas)
print("--- TAMAÑO TOTAL ---")
print(f"El archivo tiene {df.shape[0]} filas y {df.shape[1]} columnas.")

columna_pais = 'Country' 
columna_sueno = 'Sleep_Hours'  # Podría llamarse 'horas_sueño', 'Hours of Sleep', etc.

# 1. Agrupar por país, calcular el promedio (mean) de las horas de sueño
promedio_sueno = df.groupby(columna_pais)[columna_sueno].mean().reset_index()

# 2. Ordenar los resultados de mayor a menor promedio
promedio_sueno = promedio_sueno.sort_values(by=columna_sueno, ascending=False)

# 3. Redondear a 2 decimales para que se vea más limpio
promedio_sueno = promedio_sueno.round(2)

# 4. Renombrar las columnas para mostrarlas en español (opcional)
promedio_sueno.columns = ['País', 'Promedio de Horas de Sueño']

print("--- PROMEDIO DE HORAS DE SUEÑO POR PAÍS ---")
print(promedio_sueno.to_string(index=False))