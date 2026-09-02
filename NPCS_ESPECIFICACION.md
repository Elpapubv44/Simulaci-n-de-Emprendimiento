# Especificación de NPCs Trabajadores y Clientes — Joker Wash & Play v2.0

Catálogo completo de los 10 personajes interactivos modelados mediante primitivas geométricas nativas de Three.js en la maqueta 3D del complejo comercial. Cada entidad cuenta con un cartel sprite billboard sobre su cabeza con su nombre, rol y color temático de sector, además de máquina de estados procedural (`idle`, `walk`, `work`) y navegación por waypoints.

---

## 1. Matriz General de Personajes

| ID | Nombre | Rol | Ala / Ubicación | Color de Sector | Horario / Turno | Rutina Principal |
|:---|:---|:---|:---|:---|:---|:---|
| **NPC-01** | **Mateo** | Operador de Mostrador | Lavandería (Mesada) | `#3fd8e8` (Cian) | 08:00 - 16:00 | Plegado de prendas, entrega de pedidos y validación de tickets |
| **NPC-02** | **Esteban** | Mantenimiento Técnico | Lavandería (Baterías) | `#3fd8e8` (Cian) | 07:00 - 15:00 | Inspección de bombas dosificadoras, tambores y puentes H |
| **NPC-03** | **Valentina** | Croupier Principal | Casino (Ruleta) | `#f2c14e` (Oro) | 16:00 - 02:00 | Canto de apuestas, lanzamiento de bola de ruleta y pago de fichas |
| **NPC-04** | **Rodrigo** | Operador Slots & RNG | Casino (Tragamonedas) | `#f2c14e` (Oro) | 14:00 - 22:00 | Auditoría de rodillos, calibración de billeteros y chequeo de luces |
| **NPC-05** | **Lucas** | Bartender Jefe | Casino (Barra) | `#e0203c` (Rojo) | 18:00 - 04:00 | Preparación de coctelería de autor y promo "Tiempo de Espera" |
| **NPC-06** | **Camila** | Garzón de Sala | Casino / Mesas | `#f2c14e` (Oro) | 17:00 - 03:00 | Ronda de bandejas entre mesas de Blackjack, Poker y ruleta |
| **NPC-07** | **Darío** | Limpieza & Sanitización | Fumadores | `#a88cff` (Lila) | 10:00 - 18:00 | Vaciado de ceniceros, sanitización de mesas altas y filtros de aire |
| **NPC-08** | **Marcos** | Cliente Regular | Fumadores (Mesa Alta) | `#a88cff` (Lila) | 20:00 - 22:30 | Observa slots, fuma y chequea el timer de lavado en su móvil |
| **NPC-09** | **Nicolás** | Mesero Terraza | Terraza (Deck Sky Bar)| `#e0203c` (Rojo) | 18:00 - 02:00 | Servicio a mesas con sombrilla y reposición de lounge exterior |
| **NPC-10** | **Sofía** | Cliente Lounge | Terraza (Lounge Relax)| `#3fd8e8` (Cian) | 19:30 - 21:00 | Disfruta de un cóctel al aire libre esperando el aviso de retiro |

---

## 2. Detalle de Fichas de Personaje

### NPC-01: Mateo — Operador de Mostrador
* **Ubicación inicial**: `x = -15.0, y = 0.62, z = 4.2` (detrás de la mesada de plegado de ropa).
* **Indumentaria 3D**: Camisa blanca, delantal de trabajo turquesa lavandería (`#2da8bb`), pantalón oscuro.
* **Waypoints de patrulla**:
  1. `[-16.4, 0.62, 4.2]` (estación de blanquería / toallas)
  2. `[-15.0, 0.62, 4.2]` (punto medio / escáner de tickets)
  3. `[-13.6, 0.62, 4.2]` (estación de doblado y empaquetado)
* **Animaciones**:
  * `idle`: Postura erguida, leve respiración sinusoidal.
  * `walk`: Desplazamiento lateral de 1.2 m/s a lo largo del mostrador.
  * `work`: Movimiento oscilante de brazos doblando ropa y acomodando prendas ordenadas.

### NPC-02: Esteban — Técnico de Mantenimiento
* **Ubicación inicial**: `x = -13.0, y = 0.62, z = -7.5` (pasillo frente a lavadoras).
* **Indumentaria 3D**: Overol azul petróleo (`#1b4260`), chaleco reflectante con detalles cian y gorra técnica. Porta una tableta de diagnóstico en la mano izquierda.
* **Waypoints de patrulla**:
  1. `[-18.5, 0.62, -8.0]` (inspección de secarropas apilados en pared oeste)
  2. `[-15.0, 0.62, -8.5]` (lavadoras industriales frontales)
  3. `[-11.5, 0.62, -8.5]` (tanques de dosificación y solenoides)
  4. `[-13.0, 0.62, -5.0]` (verificación de retorno de agua y centrifugado)
* **Animaciones**:
  * `work`: Levanta la tableta de diagnóstico, inclina el torso para revisar compuertas de máquinas, ajusta válvulas.

### NPC-03: Valentina — Croupier Principal
* **Ubicación inicial**: `x = -3.4, y = 0.62, z = -4.0` (detrás del paño de la ruleta).
* **Indumentaria 3D**: Chaleco bordó satinado (`#5c1527`), camisa blanca de puño, moño dorado, falda negra de etiqueta.
* **Waypoints de patrulla**:
  1. `[-3.4, 0.62, -4.0]` (frente a la rueda)
  2. `[-2.6, 0.62, -4.2]` (posición de recolección de fichas)
  3. `[-4.2, 0.62, -4.2]` (posición de pago de pleno y docenas)
* **Animaciones**:
  * `work`: Gesto de lanzamiento de la bola en el cilindro, pase de manos sobre el paño ("no va más"), conteo rítmico de fichas.

### NPC-04: Rodrigo — Operador Slots & RNG
* **Ubicación inicial**: `x = -4.0, y = 0.62, z = -8.6` (pasillo de máquinas tragamonedas).
* **Indumentaria 3D**: Traje sastre oscuro (`#181622`), corbata dorada de casino (`#d4a83b`), credencial identificatoria en el pecho.
* **Waypoints de patrulla**:
  1. `[-6.0, 0.62, -8.6]` (slot Jackpot 1)
  2. `[-2.0, 0.62, -8.6]` (slot central)
  3. `[2.5, 0.62, -8.6]` (slot Jackpot progresivo 5)
* **Animaciones**:
  * `work`: Comprobación visual de botoneras LED, reinicio de tolva y verificación de lectura de billeteros con llavín.

### NPC-05: Lucas — Bartender Jefe
* **Ubicación inicial**: `x = 4.6, y = 0.62, z = 8.8` (interior de la barra de tragos del casino).
* **Indumentaria 3D**: Camisa negra arremangada, tiradores bordó, peinado pompadour estilizado.
* **Waypoints de patrulla**:
  1. `[3.2, 0.62, 8.8]` (estación de coctelera y botellas premium)
  2. `[4.8, 0.62, 8.8]` (canilla de cerveza tirada artesanal)
  3. `[6.2, 0.62, 8.8]` (punto de entrega de tragos a clientes de barra)
* **Animaciones**:
  * `work`: Movimiento enérgico de coctelera (brazos subiendo y bajando en contrapunto), pulido de copas con paño blanco.

### NPC-06: Camila — Garzón de Sala
* **Ubicación inicial**: `x = 1.0, y = 0.62, z = -1.0` (pasillo entre ruleta y blackjack).
* **Indumentaria 3D**: Vestimenta formal negra con ribete dorado en cuello y delantal corto. Sostiene una bandeja circular plateada con dos cócteles luminiscentes.
* **Waypoints de patrulla**:
  1. `[4.2, 0.62, 7.2]` (recogida de pedidos en barra)
  2. `[3.0, 0.62, 1.0]` (atención mesa de Poker)
  3. `[4.0, 0.62, -4.5]` (atención mesa Blackjack 1)
  4. `[-1.0, 0.62, -3.5]` (atención laterales de ruleta)
* **Animaciones**:
  * `walk`: Marcha erguida sosteniendo la bandeja nivelada (brazo derecho estático con bandeja, brazo izquierdo balanceándose rítmicamente).
  * `work`: Inclinación respetuosa hacia la mesa ofreciendo bebidas de cortesía.

### NPC-07: Darío — Limpieza & Sanitización
* **Ubicación inicial**: `x = 14.5, y = 0.62, z = 3.5` (sala de fumadores).
* **Indumentaria 3D**: Uniforme de mantenimiento lila ceniza (`#3f3258`), guantes de nitrilo, gorra de visera.
* **Waypoints de patrulla**:
  1. `[14.0, 0.62, 6.0]` (mesa alta sur)
  2. `[17.5, 0.62, 6.0]` (mesa alta este)
  3. `[16.0, 0.62, 1.5]` (mesa alta central con cenicero activo)
  4. `[14.0, 0.62, -6.0]` (área de tragamonedas con extractor)
* **Animaciones**:
  * `work`: Frotado circular con paño sobre superficies acrílicas y de acero inoxidable; vaciado de ceniceros en contenedor hermético.

### NPC-08: Marcos — Cliente Regular
* **Ubicación inicial**: `x = 18.2, y = 0.62, z = 2.2` (de pie junto a mesa alta con cenicero).
* **Indumentaria 3D**: Cazadora de cuero oscuro, jeans azul oscuro, zapatillas urbanas. Sostiene un cigarrillo encendido con brasa micro-LED roja.
* **Waypoints de patrulla**:
  1. `[18.2, 0.62, 2.2]` (posición fija principal)
  2. `[17.8, 0.62, 0.5]` (observa pantalla de jackpot)
* **Animaciones**:
  * `idle`: Postura relajada, apoyo en la mesa alta con una mano, mirando ocasionalmente hacia los rodillos de las máquinas.
  * `work`: Levanta la mano hacia el rostro para fumar y consulta la pantalla de su teléfono donde figura el estado de su lavarropas en el Ala Oeste.

### NPC-09: Nicolás — Mesero de Terraza
* **Ubicación inicial**: `x = -4.0, y = 7.5, z = -2.0` (deck de madera del primer piso).
* **Indumentaria 3D**: Guayabera roja coral (`#d6354b`), pantalón de lino claro, bandeja veraniega.
* **Waypoints de patrulla**:
  1. `[-8.0, 7.5, -6.8]` (barra del Sky Bar)
  2. `[-2.0, 7.5, 3.5]` (mesa con sombrilla 1)
  3. `[6.0, 7.5, 2.5]` (mesa con sombrilla 2)
  4. `[14.0, 7.5, -2.0]` (mesa con sombrilla 3 y mirador)
* **Animaciones**:
  * `walk`: Marcha ágil entre las guirnaldas y maceteros del deck exterior.
  * `work`: Deja jarras frías y copas tropicales en las mesas con sombrilla.

### NPC-10: Sofía — Cliente Lounge
* **Ubicación inicial**: `x = -15.5, y = 7.5, z = 6.2` (sillón lounge de la terraza).
* **Indumentaria 3D**: Vestido veraniego turquesa suave (`#4fc3d9`), accesorios dorados, copa de autor con sorbete.
* **Waypoints de patrulla**:
  1. `[-15.5, 7.5, 6.2]` (lounge oeste)
  2. `[-13.0, 7.5, 4.5]` (mirador hacia la vereda y farolas de la calle)
* **Animaciones**:
  * `idle`/`work`: Sentada descansando, disfrutando de la música ambiental y la vista nocturna mientras su ropa cumple el ciclo de secado.

---

## 3. Implementación Técnica en Three.js

* **Estructura de la Malla**:
  * `root`: `THREE.Group` con coordenadas mundiales y rotación $Y$.
  * `torso`: `BoxGeometry` o `CylinderGeometry` con materiales de sombreado mate (`roughness: 0.8`).
  * `cabeza`: `SphereGeometry` con cabello / sombrero distintivo.
  * `extremidades`: Brazos y piernas articulados con pivotes de rotación para oscilación procedural de marcha (`Math.sin(walkCycle)`).
  * `accesorio`: Bandeja, cóctel, tableta o paño asignado según el rol.
* **Cartel Billboard Sprite**:
  * Canvas dinámico con fondo semitransparente `#0c0a12`, tipografía legible Inter/Bebas Neue, nombre en blanco de alto contraste y rol destacado con el color oficial del sector (`acc`).
  * Tamaño ajustado para visibilidad perfecta tanto en vista de pájaro como en primera persona a escala 1:1.
* **Evitación de Obstáculos y Colisión entre NPCs**:
  * Radio de seguridad de `0.6 m` entre personajes para evitar solapamientos durante la navegación por waypoints.
