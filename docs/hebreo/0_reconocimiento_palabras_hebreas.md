# **Módulo didáctico: reconocimiento de palabras hebreas bíblicas**

## **Objetivo**

Dada una **forma hebrea vocalizada**, determinar:

1. si es **verbo** o **no verbo**  
2. si es verbo, qué **tipo de forma** es  
3. cuál es su **raíz**  
4. cuál es su **binyan**  
5. dónde puede ayudar el **código de colores**  
6. cómo producir una **explicación pedagógica**

---

## **Supuestos lingüísticos base**

* Toda consonante debe llevar vocal, shevá o quedar quiescente según las reglas masoréticas.  
* El análisis debe distinguir:  
  * prefijos  
  * sufijos  
  * dagesh suave / fuerte  
  * shevá móvil / quiescente  
  * guturales  
  * longitud y clase vocálica.  
* El **código de colores** es una herramienta **secundaria** de reconocimiento visual, especialmente útil en el **imperfecto** de varios binyanim, no un criterio primario universal. Las lecciones sobre Hitpael, Hofal y verbos débiles lo usan justamente como clave de reconocimiento parcial.

---

# **Pseudocódigo general**

FUNCTION analizar\_token\_hebreo(token):

    INPUT:  
        token \= palabra hebrea vocalizada

    OUTPUT:  
        analisis \= estructura con:  
            \- categoria\_general  
            \- subcategoria  
            \- raiz  
            \- binyan\_o\_patron  
            \- rasgos\_morfologicos  
            \- uso\_codigo\_colores  
            \- nivel\_confianza  
            \- explicacion\_didactica

    STEP 1: normalizar(token)  
        \- conservar consonantes, vocales, shevá, dagesh, maqqef si existe  
        \- detectar si hay signos masoréticos relevantes  
        \- separar maqqef si forma unidad compuesta

    STEP 2: detectar\_marcadores\_graficos(token)  
        \- identificar consonantes  
        \- identificar vocales:  
            pataj, segol, hireq, qamets, qamets-hatuf, qibbuts,  
            tsere, hireq-yod, holem, shureq, shevá simple, shevá compuesta  
        \- identificar dagesh:  
            suave o fuerte  
        \- identificar guturales:  
            א ה ח ע ר (ר con tratamiento parcialmente gutural)  
        \- registrar sílabas tentativas  
        \- registrar acento si es visible

    STEP 3: clasificar\_tipo\_general(token)  
        IF token tiene artículo prefijado הַ / הָ / הֶ  
            THEN marcar como "probable nombre/adjetivo", no verbo por defecto  
        ELSE IF token presenta terminaciones nominales frecuentes  
            (ים, ות, ָה, ת, ַיִם)  
            THEN marcar como "probable nombre/adjetivo"  
        ELSE IF token presenta prefijos verbales personales  
            (א, ת, י, נ) con vocalismo verbal  
            THEN marcar como "probable verbo finito"  
        ELSE IF token presenta sufijos verbales personales  
            (תי, תָ, תְּ, תֶּם, תֶּן, נוּ, וּ)  
            THEN marcar como "probable verbo finito"  
        ELSE IF token presenta prefijos característicos de binyan  
            (הִתְ, הִ, הָ, הֻ, נִ)  
            THEN marcar como "probable verbo"  
        ELSE IF token presenta לְ \+ forma verbal reconocible  
            THEN marcar como "probable infinitivo constructo"  
        ELSE IF token presenta מ prefijada con patrón verbal  
            THEN marcar como "probable participio"  
        ELSE  
            marcar como "indeterminado"  
---

# **Bloque 1: si NO parece verbo**

FUNCTION analizar\_no\_verbo(token):

    IF tiene artículo  
        THEN analizar efecto del artículo:  
            \- הַ \+ dagesh fuerte  
            \- compensación con gutural  
            \- variantes הָ / הֶ según contexto  
        RETURN categoria \= "nombre/adjetivo definido"

    IF termina en ים  
        RETURN categoria \= "nombre/adjetivo plural masculino probable"

    IF termina en ות  
        RETURN categoria \= "nombre/adjetivo plural femenino probable"

    IF termina en ָה o ת  
        RETURN categoria \= "nombre/adjetivo femenino singular probable"

    IF coincide con lista de partículas frecuentes  
        RETURN categoria \= "partícula/preposición/conjunción/pronombre"

    ELSE  
        RETURN categoria \= "nombre/adjetivo/partícula por confirmar"

Esto sigue bien las reglas de artículo, prefijos y morfología nominal del material.

---

# **Bloque 2: si parece verbo**

FUNCTION analizar\_verbo(token):

    STEP V1: detectar\_tipo\_de\_forma\_verbal(token)

        IF inicia con אחד de los prefijos personales {א, ת, י, נ}  
           AND hay vocalismo compatible con conjugación prefijada  
            THEN tipo\_forma \= "imperfecto / yusivo / cohortativo posible"

        ELSE IF termina con sufijo personal de perfecto  
            THEN tipo\_forma \= "perfecto"

        ELSE IF inicia con הִתְ o variante por metátesis  
            THEN tipo\_forma \= "hitpael (forma finita o no finita según contexto)"

        ELSE IF inicia con לְ y la base restante es verbal  
            THEN tipo\_forma \= "infinitivo constructo probable"

        ELSE IF inicia con מ y el patrón restante es verbal  
            THEN tipo\_forma \= "participio probable"

        ELSE IF coincide con patrón imperativo  
            THEN tipo\_forma \= "imperativo probable"

        ELSE  
            tipo\_forma \= "verbo no determinado"

    STEP V2: reconstruir\_raiz(token)

        \- quitar prefijos no radicales:  
            ו, ל, ב, כ, מ, ה del artículo, prefijos personales  
        \- quitar sufijos flexivos  
        \- detectar dagesh por asimilación  
        \- restaurar radicales ausentes si el verbo es débil

        IF aparecen tres radicales claras  
            THEN raiz \= esas tres radicales

        ELSE  
            aplicar\_clave\_verbos\_debiles(token)

---

# **Bloque 3: clave de verbos débiles**

Este punto debe seguir la lógica de las lecciones sobre verbos débiles: cuando no aparecen las tres radicales, hay que inferir si la raíz es I-נ, I-י, I-ו, II-vocal, II-geminada, III-ה, etc.

FUNCTION aplicar\_clave\_verbos\_debiles(token):

    IF solo aparecen dos radicales:  
        IF hay preformativo y vocal del preformativo \= qamets  
            THEN sugerir:  
                \- raíz II-vocal (alta probabilidad)  
                \- o raíz II-geminada (probabilidad menor)

        IF hay preformativo y vocal del preformativo \= tsere  
            THEN sugerir:  
                \- raíz I-ו  
                \- o algunas III-ה

        IF hay preformativo y vocal del preformativo \= hireq  
            THEN sugerir:  
                \- raíz III-ה  
                \- o Qal / Nifal según otras marcas

        IF hay preformativo y vocal del preformativo \= pataj  
            THEN sugerir:  
                \- raíz III-ה  
                \- Qal o Hifil según la siguiente radical

        IF hay holem-vav  
            THEN sugerir:  
                \- raíz I-ו  
                \- posible Nifal o Hifil según patrón

        IF no hay prefijo y vocal principal \= qamets  
            THEN sugerir raíz II-vocal

        IF no hay prefijo y vocal principal \= tsere  
            THEN sugerir raíz I-ו

        IF no hay prefijo y vocal principal \= pataj  
            THEN sugerir raíz II-geminada

    RETURN lista\_de\_hipotesis\_de\_raiz

Esto está directamente alineado con la clave resumida de la Lección 8\.

---

# **Bloque 4: identificación de binyan**

FUNCTION identificar\_binyan(token, tipo\_forma, raiz\_hipotetica):

    IF token muestra preformativo הִתְ  
        OR muestra metátesis de ת con sibilante  
        THEN binyan \= "Hitpael"

    ELSE IF token muestra prefijo ה con qamets-hatuf o qibbuts en perfecto  
        THEN binyan \= "Hofal"

    ELSE IF tipo\_forma \== "imperfecto"  
         AND vocal del preformativo \= qamets-hatuf  
        THEN binyan \= "Hofal probable"

    ELSE IF tipo\_forma \== "imperfecto"  
         AND vocal del preformativo \= pataj  
         AND siguiente radical es fuerte  
        THEN binyan \= "Hifil probable"

    ELSE IF tipo\_forma \== "imperfecto"  
         AND vocal del preformativo \= shevá  
        THEN binyan \= "Piel o Pual probable"

    ELSE IF hay dagesh fuerte en la segunda radical  
         AND no hay הִתְ  
        THEN binyan \= "Piel / Pual por resolver según vocalismo"

    ELSE IF tipo\_forma \== "imperfecto"  
         AND vocal del preformativo \= hireq  
         AND hay dagesh o asimilación en la primera radical  
        THEN binyan \= "Nifal probable"

    ELSE IF aparece prefijo נ explícito característico  
        THEN binyan \= "Nifal probable"

    ELSE  
        binyan \= "Qal o no determinado"

Esto sigue la información repartida entre Farfán y las lecciones de Hitpael, Hofal y verbos débiles.

---

# **Bloque 5: ubicación del código de colores**

Aquí es donde entra exactamente.

FUNCTION aplicar\_codigo\_de\_colores(token, tipo\_forma, binyan\_preliminar):

    IF tipo\_forma \!= "imperfecto"  
        THEN  
            return {  
                usar\_codigo: FALSE,  
                razon: "El código de colores no es criterio principal fuera del imperfecto; puede servir solo como apoyo visual limitado."  
            }

    ELSE  
        secuencia \= convertir\_vocales\_a\_colores(token)

        COMPARAR secuencia con patrones didácticos conocidos:

            Nifal   \-\> verde \- rojo \- verde  
            Piel    \-\> violeta \- rojo \- verde  
            Pual    \-\> violeta \- naranja \- rojo  
            Hifil   \-\> rojo \- violeta \- verde  
            Hitpael \-\> verde \- violeta \- rojo \- verde  
            Hofal   \-\> naranja \- violeta \- rojo

        IF secuencia coincide con binyan\_preliminar  
            THEN confirmacion\_visual \= "alta"

        ELSE IF secuencia coincide con otro binyan posible  
            THEN generar\_ambiguedad\_y\_revisar\_marcadores\_estructurales

        ELSE  
            THEN confirmacion\_visual \= "baja"

    RETURN resultado\_codigo\_colores

Las secuencias de Hitpael y Hofal sí aparecen explícitamente en tus lecciones.  
 La secuencia de Nifal y las demás se están usando como clave visual interna del módulo, pero siempre subordinada a la morfología.

---

# **Bloque 6: jerarquía de decisión**

Esto es importante para que la IA no use mal el código.

FUNCTION resolver\_decision\_final(datos):

    PRIORIDAD 1:  
        marcadores morfológicos explícitos  
        \- prefijos  
        \- sufijos  
        \- dagesh  
        \- presencia/ausencia de nun  
        \- הִתְ, הִ, הָ, הֻ, מ prefijada, etc.

    PRIORIDAD 2:  
        reconstrucción de raíz  
        \- incluyendo verbos débiles

    PRIORIDAD 3:  
        tipo de forma verbal  
        \- perfecto, imperfecto, participio, infinitivo, imperativo

    PRIORIDAD 4:  
        código de colores  
        \- solo como confirmación visual, sobre todo en imperfecto

    PRIORIDAD 5:  
        contexto léxico y frecuencia  
        \- comprobar en vocabulario si la raíz es alta frecuencia  
        \- verificar si la glosa concuerda

---

# **Bloque 7: salida didáctica**

El módulo no solo debe clasificar; debe enseñar.

FUNCTION generar\_explicacion\_didactica(token, analisis):

    imprimir "Token:", token  
    imprimir "Paso 1: tipo general de palabra"  
    imprimir "Paso 2: marcas observadas"  
    imprimir "Paso 3: raíz propuesta"  
    imprimir "Paso 4: binyan propuesto"  
    imprimir "Paso 5: uso del código de colores"  
    imprimir "Paso 6: traducción literal"  
    imprimir "Paso 7: observaciones y alternativas"

    IF hay ambiguedad  
        imprimir "Ambigüedad: ..."  
        imprimir "Lecturas posibles: ..."

    IF token no admite uso seguro del código  
        imprimir "Nota didáctica: el código de colores aquí no decide la forma, porque no estamos en un imperfecto claro."

    IF verbo es débil  
        imprimir "Nota didáctica: se restauró radical ausente por tratarse de verbo débil."

---

# **Ejemplo de ejecución**

## **Caso 1: יִכָּתֵב**

entrada \= יִכָּתֵב

tipo\_general \= verbo  
tipo\_forma \= imperfecto  
marcas:  
    prefijo י  
    hireq en preformativo  
    dagesh en כ  
raiz \= כתב  
binyan\_preliminar \= Nifal  
codigo\_colores \= verde-rojo-verde  
confirmacion\_visual \= alta  
salida \= "Nifal imperfecto 3ms de כתב: él será escrito"

---

## **Caso 2: לֵאמֹר**

entrada \= לֵאמֹר

tipo\_general \= verbo  
tipo\_forma \= infinitivo constructo  
raiz \= אמר  
binyan\_preliminar \= Qal  
codigo\_colores \= no aplicar como criterio principal  
salida \= "Qal infinitivo constructo con לְ: para decir / diciendo"  
---

## **Caso 3: הַמֶּלֶךְ**

entrada \= הַמֶּלֶךְ

tipo\_general \= no verbo  
marcas:  
   artículo prefijado הַ  
   dagesh por efecto del artículo  
categoria \= nombre definido  
salida \= "el rey"  
---

# **Regla maestra del módulo**

NO usar el código de colores como filtro inicial.  
USAR el código de colores solo después de:  
   1\. identificar si la forma es verbal  
   2\. reconocer el tipo de forma  
   3\. proponer raíz y binyan  
---

# **Versión compacta del algoritmo**

FUNCTION modulo\_didactico(token):

   normalizar(token)  
   detectar\_marcadores\_graficos(token)

   IF parece\_no\_verbo(token):  
       return analizar\_no\_verbo(token)

   ELSE:  
       tipo\_forma \= detectar\_tipo\_de\_forma\_verbal(token)  
       raiz \= reconstruir\_raiz(token)  
       binyan \= identificar\_binyan(token, tipo\_forma, raiz)

       IF tipo\_forma \== imperfecto:  
           colores \= aplicar\_codigo\_de\_colores(token, tipo\_forma, binyan)  
       ELSE:  
           colores \= "uso limitado o no aplicable"

       return generar\_explicacion\_didactica(token, {  
           tipo\_forma,  
           raiz,  
           binyan,  
           colores  
       })  
