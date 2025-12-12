# Guía para Referencias Bíblicas de Apoyo

> **Última actualización:** 2025-12-11  
> **Propósito:** Criterios para seleccionar textos de apoyo efectivos

---

## 🎯 Propósito

Las referencias bíblicas de apoyo:
- Conectan el pasaje con el resto de las Escrituras
- Refuerzan la proposición desde múltiples ángulos
- Demuestran la coherencia de la Biblia
- Enriquecen la predicación

---

## 📐 Criterios de Selección

### **Cantidad por Punto**
- **Mínimo:** 2 referencias (pasaje principal + 1 apoyo)
- **Óptimo:** 3 referencias (pasaje + 2 apoyos)
- **Máximo:** 4 referencias (más puede abrumar)

### **Tipos de Referencias**

#### **1. Pasaje Principal**
- El texto que se está predicando
- SIEMPRE debe incluirse
- Formato: Versículos específicos

**Ejemplo:**
- Predicando Filipenses 2 → "Filipenses 2:5-11"

#### **2. Paralelos Directos**
- Otros textos que hablan del mismo tema
- Refuerzan la idea main del punto

**Ejemplo:**
- Para humildad de Cristo → "Juan 13:3-5" (Lavamiento de pies)
- Para exaltación → "Apocalipsis 5:11-14" (Adoración en cielos)

#### **3. Tipos/Sombras del AT**
- Prefiguraciones que se cumplen en Cristo
- Conectan ambos testamentos

**Ejemplo:**
- Cristo como siervo → "Isaías 53:3-5" (Siervo sufriente)
- Humillación de José → "Génesis 37-50" (tipo de Cristo)

#### **4. Aplicaciones Prácticas** 
- Textos que muestran cómo vivir la verdad
- Para puntos de aplicación

**Ejemplo:**
- Imitando a Cristo → "1 Pedro 2:21-23"
- Servicio humilde → "Marcos 10:42-45"

---

## ✅ Criterios de Calidad

### **RELEVANCIA**
- [ ] ¿Realmente apoya el punto?
- [ ] ¿No es forzada la conexión?
- [ ] ¿Añade valor o solo rellena?

### **DIVERSIDAD**
- [ ] No solo un solo libro de la Biblia
- [ ] Balancear AT y NT
- [ ] Diferentes géneros literarios

### **ACCESIBILIDAD**
- [ ] No tan oscuras que nadie las conozca
- [ ] No tan obvias que no agreguen nada
- [ ] Familiar pero fresca

### **PRECISIÓN**
- [ ] Formato correcto (Libro Cap:Versículos)
- [ ] Rango apropiado (no muy largo)
- [ ] Contexto respetado

---

## 📊 Ejemplos por Punto

### **Punto sobre Humildad de Cristo**

✅ **Buena selección:**
```json
"scriptureReferences": [
  "Filipenses 2:5-8",      // Pasaje principal
  "Juan 13:3-5",           // Paralelo NT (lavamiento)
  "Isaías 53:3-5"          // Tipo AT (siervo)
]
```

❌ **Mala selección:**
```json
"scriptureReferences": [
  "Filipenses 2:5-8",      // OK
  "Filipenses 2:9-11",     // Demasiado cercano
  "Filipenses 1:27"        // No tan relevante
]
```

### **Punto sobre Exaltación**

✅ **Buena selección:**
```json
"scriptureReferences": [
  "Filipenses 2:9-11",     // Pasaje principal
  "Hebreos 1:3-4",         // Exaltación de Cristo
  "Daniel 7:13-14"         // Profecía mesiánica
]
```

---

## 🎨 Adaptación por Enfoque

### **Expositivo/Didáctico**
- Más referencias (3-4 por punto)
- Énfasis en AT y NT
- Textos teológicamente densos
- **Ejemplo:** Romanos, Hebreos, Profetas Mayores

### **Pastoral/Ánimo**
- Referencias consoladoras
- Promesas y seguridades
- Textos experimentales
- **Ejemplo:** Salmos, 1 Pedro, profecías de restauración

### **Evangelístico**
- Textos evangelísticos claros
- Promesas de salvación
- Llamados a decisión
- **Ejemplo:** Juan, Romanos 3-6, Hechos

### **Apologético**
- Textos con evidencia
- Profecías cumplidas
- Historicidad
- **Ejemplo:** Isaías 53, Salmo 22, Daniel

---

## ❌ Errores Comunes

### **1. Solo Versículos Consecutivos**
❌ Todos de Filipenses 2
✅ Variedad de libros y épocas

### **2. Fuera de Contexto**
❌ Usar un versículo que significa otra cosa en contexto
✅ Respetar el significado original

### **3. Demasiadas**
❌ 7-8 referencias por punto
✅ 2-3 bien seleccionadas

### **4. Referencias Genéricas**
❌ "Ver también Juan 3:16" (sin explicar por qué)
✅ Referencias que específicamente refuerzan el punto

### **5. Formato Incorrecto**
❌ "Juan tres dieciséis"
❌ "Jn 3.16"
✅ "Juan 3:16"

---

## 📋 Checklist Pre-Generación

Antes de incluir una referencia, pregunta:

1. **¿Apoya directamente mi punto?**
2. **¿Es del contexto correcto?**
3. **¿Agrega valor único?**
4. **¿Es accesible para la audiencia?**
5. **¿Formato correcto?**

Si respuesta a todo es SÍ → Inclúyela  
Si alguna es NO → Busca otra

---

## 🔧 Formato Requerido

```json
"scriptureReferences": [
  "Libro Capítulo:Versículo(s)",
  "Libro Capítulo:Versículo-Versículo",
  "Libro Capítulo:Versículo"
]
```

**Ejemplos válidos:**
- "Filipenses 2:5-11"
- "Juan 13:3-5"
- "Romanos 12:3"
- "1 Corintios 13:1-7"

**Inválidos:**
- "Filipenses" (sin capítulo/versículo)
- "Fil 2:5-11" (abreviatura incorrecta)
- "Filipenses capítulo 2" (sin versículo)

---

**Última revisión:** 2025-12-11
