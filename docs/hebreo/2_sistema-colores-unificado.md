# **SISTEMA DE COLORES UNIFICADO (LISTO PARA APP)**

Este sistema combina:

* ✅ tu código fonético (vocales)  
* ✅ el código morfológico (estructura verbal)

👉 Diseñado específicamente para implementación en **Tamagui \+ React Native**

---

# **🧠 1\) PRINCIPIO CLAVE**

**Dos capas independientes de información visual**

### **Capa A → MORFOLÓGICA (estructura)**

### **Capa B → FONÉTICA (vocales)**

👉 Nunca deben competir visualmente  
 👉 Deben complementarse

---

# **🎯 2\) CAPA MORFOLÓGICA (PRINCIPAL)**

Esta es la más importante para reconocer binyanim.

## **🎨 Colores base**

| Elemento | Color | Hex | Uso |
| ----- | ----- | ----- | ----- |
| Prefijo | 🔵 azul petróleo | `#2563EB` | הִ / נִ / הִתְ |
| Radicales | ⚪ blanco | `#F9FAFB` | raíz |
| Vocal temática | 🟡 ámbar | `#F59E0B` | patrón del binyan |
| Dagesh fuerte | 🔴 coral | `#EF4444` | intensificación |
| Sufijos | 🟣 violeta | `#8B5CF6` | terminaciones |
| Shevá | ⚫ gris suave | `#6B7280` | neutro |

---

## **🔍 Ejemplo (morfología)**

הִתְקַדֵּשׁ

* הִתְ → 🔵 prefijo (Hitpael)  
* ק ד ש → ⚪ raíz  
* ַ ֵ → 🟡 vocal temática  
* דּ → 🔴 dagesh

---

# **🔊 3\) CAPA FONÉTICA (SECUNDARIA)**

Basada en TU sistema original 👇

| Tipo vocal | Color | Hex |
| ----- | ----- | ----- |
| Clase A (qamets/pataḥ) | 🔴 rojo | `#DC2626` |
| Clase E/I (segol/tsere/jireq) | 🟢 verde | `#16A34A` |
| Clase O/U (jolem/qibbuts) | 🟠 naranja | `#EA580C` |
| Shevá compuesto | 🟣 púrpura | `#7C3AED` |

---

# **⚠️ 4\) REGLA DE ORO**

👉 **La capa morfológica domina**  
 👉 La fonética es sutil

---

## **Cómo lograrlo visualmente**

| Capa | Estilo |
| ----- | ----- |
| Morfológica | color de fondo o letra |
| Fonética | subrayado o pequeño indicador |

---

# **🧩 5\) IMPLEMENTACIÓN VISUAL**

## **Ejemplo render real**

הִתְקַדֵּשׁ

### **Forma 1 (recomendada)**

* Prefijo: texto azul  
* Raíz: blanco  
* Dagesh: rojo  
* Vocales: subrayado de color

---

## **Ejemplo conceptual**

\[🔵 הִתְ\]\[⚪ ק\]\[🟡 ַ\]\[⚪ ד\]\[🔴ּ\]\[🟡 ֵ\]\[⚪ שׁ\]  
---

# **🧪 6\) MODOS DE APRENDIZAJE**

## **🟢 Modo 1: Principiante**

* Morfología: visible  
* Fonética: visible

## **🟡 Modo 2: Intermedio**

* Morfología: visible  
* Fonética: tenue

## **🔴 Modo 3: Avanzado**

* Sin colores  
* Feedback después

---

# **🎨 7\) TOKENS PARA TAMAGUI**

export const tokens \= {  
 color: {  
   prefix: "\#2563EB",  
   root: "\#F9FAFB",  
   themeVowel: "\#F59E0B",  
   dagesh: "\#EF4444",  
   suffix: "\#8B5CF6",  
   sheva: "\#6B7280",

   vowelA: "\#DC2626",  
   vowelEI: "\#16A34A",  
   vowelOU: "\#EA580C",  
   vowelReduced: "\#7C3AED",  
 }  
}  
---

# **🧱 8\) COMPONENTE CLAVE (React Native)**

const HebrewWord \= ({ segments }) \=\> {  
 return (  
   \<Text style={{ fontSize: 28 }}\>  
     {segments.map((seg, i) \=\> (  
       \<Text key={i} style={{ color: getColor(seg.role) }}\>  
         {seg.text}  
       \</Text\>  
     ))}  
   \</Text\>  
 )  
}  
---

# **🔥 9\) REGLAS DE UX (MUY IMPORTANTES)**

## **❌ NO hacer:**

* saturar de colores  
* usar fondo brillante  
* mezclar demasiados tonos

## **✅ HACER:**

* colores suaves  
* contraste alto  
* animación al explicar

---

# **🧠 10\) EFECTO PEDAGÓGICO**

Este sistema permite:

👉 Ver el binyan SIN pensar  
 👉 Identificar patrón en milisegundos  
 👉 Aprender sin memorizar tablas

