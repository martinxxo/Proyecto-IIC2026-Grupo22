import matplotlib.pyplot as plt
import pandas as pd
import os

path = os.path.join('code', 'data', 'Work Productivity.csv')
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

