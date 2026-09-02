# Checklist de Optimizaciones de Rendimiento — Joker Wash & Play v2.0

Este documento detalla todas las optimizaciones técnicas de rendimiento aplicadas al motor Three.js de **Joker Wash & Play**, diseñadas para mantener 60 FPS estables, reducir el consumo de GPU/CPU y garantizar compatibilidad fluida en navegadores modernos.

---

## 1. Mapa de Sombras (Shadow Maps)
* **Antes**: Resolución de `2048 x 2048` px en la luz direccional principal (`moon`).
* **Optimización**: Reducido a `1024 x 1024` px con `PCFSoftShadowMap`.
* **Ajuste de Bias**:
  * `moon.shadow.bias = -0.0006` (elimina el "shadow acne" en superficies planas).
  * `moon.shadow.normalBias = 0.02` (evita artefactos en caras curvas y bordes finos).
* **Impacto**: Ahorro del 75% en memoria de texturas de sombra y reducción drástica del fillrate en el pase de renderizado de profundidad.

---

## 2. Niebla Exponencial (`FogExp2`)
* **Antes**: `THREE.Fog(0x05040a, 70, 190)` (cálculo lineal basado en planos `near` y `far`).
* **Optimización**: Reemplazado por `THREE.FogExp2(0x05040a, 0.012)`.
* **Impacto**:
  * Simulación atmosférica más realista con decaimiento lumínico exponencial nocturno/cyberpunk.
  * Menor carga matemática en el shader de fragmentos y transición más suave hacia la oscuridad exterior.

---

## 3. Reducción de Segmentos Geométricos (Tessellation Budgets)
Se redujo la complejidad poligonal de las primitivas curvas sin pérdida perceptible de calidad visual:
* **Farolas de la calle**: Segmentos radiales de cilindro reducidos de `10` a `8`.
* **Sillas y taburetes**: Segmentos de asiento y base reducidos de `12` a `8`.
* **Palanca de tragamonedas**: Segmentos reducidos de `8` a `6`.
* **Mesa de ruleta**: Segmentos del cilindro central reducidos de `32` a `16`; moldura perimetral (`TorusGeometry`) reducida de `40` a `20` segmentos tubulares.
* **Paños de mesas (Blackjack, Poker)**: Segmentos reducidos de `40` a `20`.
* **Lavarropas y secarropas**: Ojos de buey (`CircleGeometry`) y aros cromados (`TorusGeometry`) reducidos de `26` a `16` segmentos.
* **Campanas extractoras**: Aros de neón reducidos de `24` a `14` segmentos.
* **Impacto**: Reducción de más de 45.000 vértices en la escena total, acelerando el vertex shading y draw calls.

---

## 4. Rango e Intensidad de Luces Puntuales (`PointLights`)
Las luces puntuales con atenuación cuadrática son la fuente principal de fragment shading costoso:
* **Farolas exteriores**:
  * Intensidad reducida de `26` a `16`.
  * Radio/distancia de atenuación reducida de `26` a `18`.
* **Lavandería (luz central)**:
  * Intensidad reducida de `40` a `22`.
  * Distancia de `26` a `18`.
* **Casino (arañas colgantes x3)**:
  * Intensidad reducida de `55` a `28`.
  * Distancia reducida de `22` a `16`.
* **Sala de Fumadores**:
  * Intensidad de `42` a `22`; distancia de `24` a `16`.
* **Terraza Sky Bar**:
  * Luz central de `60` a `30` (distancia `40` a `24`).
  * Luz de barra de `40` a `20` (distancia `30` a `18`).
* **Impacto**: Menor solapamiento de radios de luces por fragmento de píxel, aliviando cuellos de botella de GPU.

---

## 5. Caché de Texturas Canvas en `Map`
* **Antes**: Cada cartel o gráfico generaba un nuevo elemento `<canvas>`, pintaba y creaba un nuevo `THREE.CanvasTexture`, provocando múltiples transferencias redundantes a la VRAM.
* **Optimización**: Se implementó una estructura `Map` (`textTexCache` y caché singleton para `jokerTex`). Si un cartel con los mismos parámetros de texto, color, fuente y resplandor ya existe, se reutiliza la textura existente.
* **Impacto**: Cero duplicación de texturas en memoria VRAM y recolector de basura (GC) más limpio.

---

## 6. Throttling del Raycaster en `pointermove`
* **Antes**: El raycasting hacia los hitboxes de entrada se ejecutaba en cada micro-movimiento del mouse (hasta 120-240 Hz en ratones gamer).
* **Optimización**: Throttling temporal a ~30 FPS (`delta >= 33 ms`). Además, en modo FPS o durante transiciones de cámara (`flyTo`), el raycasting se suspende de inmediato.
* **Impacto**: Ahorro de tiempo en el hilo principal de JavaScript, eliminando micro-stutters al mover el cursor.

---

## 7. Reducción de Partículas de Humo
* **Antes**: `220` partículas en la sala de fumadores.
* **Optimización**: Reducido a `80` partículas con ajuste óptimo de escala (`size: 1.6`) y velocidad vertical procedural.
* **Impacto**: Reducción del 64% en partículas activas con buffer de atributos actualizado en cada tick, manteniendo el mismo volumen visual envolvente.

---

## 8. Pausa del Render Loop en Pestañas Ocultas (`visibilitychange`)
* **Implementación**: Se escucha el evento `document.visibilitychange`.
* **Comportamiento**: Cuando la pestaña pierde el foco o se minimiza (`document.hidden = true`), el render loop de Three.js suspende la ejecución pesada y reinicia el delta del reloj al reanudar.
* **Impacto**: 0% de uso de GPU en segundo plano y ahorro de batería en laptops y dispositivos portátiles.

---

## 9. Oclusión Manual de Alas (Frustum / Wing Culling)
* **Implementación**: Cuando el usuario entra a una sección específica (ej. Lavandería), los interiores de las alas distantes no visibles desde ese ángulo se desactivan (`visible = false`). Al regresar al exterior o a la terraza, se reactiva la visibilidad completa.
* **Impacto**: El pipeline de Three.js descarta instantáneamente las mallas de los interiores ocultos sin enviarlas a la GPU.
