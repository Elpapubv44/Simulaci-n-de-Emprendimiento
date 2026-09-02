# Flujo de Trabajo del Negocio — Joker Wash & Play

Modelo operacional y tecnológico integral del complejo comercial híbrido que combina **Lavandería Autoservicio 24 h**, **Casino / Salón de Juegos** y **Sky Bar / Terraza Lounge** bajo una arquitectura sinérgica unificada.

---

## 1. Cadena de Valor y Fases Operativas (15 Pasos del PDF)

```
[Abastecimiento] ──► [Higiene Inicial] ──► [Chequeo Técnico] ──► [Apertura Locales]
       │
       ▼
[Panel Táctil 14"] ──► [Cobro Efectivo/QR] ──► [Puente H / Lavado] ──► [Evento WebSocket]
       │
       ▼
[Traslado a Bar/Casino] ──► [Promo Espera] ──► [Pantallas Sync] ──► [Mantenimiento Mazos/RNG]
       │
       ▼
[Alerta "Listo"] ──► [Arqueo Independiente] ──► [Cierre Nocturno]
```

### Paso 1: Abastecimiento de Insumos
* Relleno de tolvas de detergente industrial, blanqueador óptico y suavizante microencapsulado en la batería de 7 lavarropas y 10 secarropas.
* Suministro de bobinas térmicas para impresoras de tickets en cajas de lavandería y billeteros de casino.
* Reposición de fichas oficiales de paño y stock de bebidas/insumos para el Bar del Casino y el Sky Bar de la Terraza.

### Paso 2: Limpieza e Higiene Inicial
* Sanitización profunda de tambores de lavado y filtros de pelusa en secarropas.
* Limpieza de paños de fieltro en ruleta, blackjack y mesas de póker con aspirado antiestático.
* Vaciado y desinfección de ceniceros con filtro en Sala de Fumadores y revisión de campanas de extracción centrífuga.

### Paso 3: Verificación Técnica de Sistemas
* Testeo de conectividad en terminales Raspberry Pi (RPi) encargadas del control de displays y sonido.
* Calibración de billeteros electrónicos multimoneda y validadores ópticos en tragamonedas y kioscos de pago.
* Verificación de pantallas sincronizadas de señalética digital en planta baja y terraza.

### Paso 4: Apertura de Locales
* Desbloqueo de puertas automáticas y encendido de marquesinas de neón y perimetrales cyberpunk.
* Sincronización de cajas registradoras con el servidor central.

### Paso 5: Selección de Ciclo en Pantalla Táctil de 14"
* El cliente ingresa al Ala Oeste (Lavandería) y accede al tótem interactivo de autoservicio (14 pulgadas, interfaz táctil intuitiva).
* Selección de programa:
  * Lavado express (25 min)
  * Lavado intensivo / acolchados (45 min)
  * Lavado delicado / calzado / cortinas (35 min)
  * Secado por calor modulado (20-40 min)

### Paso 6: Procesamiento de Pago (Arduino + Mercado Pago)
* Sistema dual de cobro:
  * **Efectivo / Billetes**: Aceptador de billetes gobernado por microcontrolador Arduino con señal por pulso seguro.
  * **Digital**: Pantalla dinámica con código QR interoperable (Mercado Pago / billeteras virtuales / tarjetas de débito).

### Paso 7: Inyección de Insumos vía Puentes H + Inicio de Ciclo
* Una vez acreditado el pago, el controlador industrial acciona módulos **Puente H (L298N / relés de estado sólido)** para accionar bombas peristálticas dosificadoras de detergente líquido y suavizante con mililitraje exacto.
* Cierre electromagnético de la puerta del tambor y arranque del ciclo seleccionado.

### Paso 8: Publicación de Evento al Servidor Central (WebSocket)
* La Raspberry Pi de la lavadora emite un paquete JSON en tiempo real hacia el servidor central:
  ```json
  {
    "evento": "CICLO_INICIADO",
    "maquina_id": "LAV-03",
    "tipo_ciclo": "INTENSIVO",
    "tiempo_restante_seg": 2700,
    "ticket_token": "JW-9821-X",
    "timestamp": 1756828800
  }
  ```
* Se imprime un ticket físico con código de barras / token QR y tiempo estimado.

### Paso 9: Traslado del Cliente a Bar o Casino
* En lugar de esperar pasivamente en un banco rígido de lavandería, el cliente transita naturalmente hacia:
  * **Ala Central (Casino)**: Ruleta en vivo, mesas de cartas o tragamonedas con jackpot progresivo.
  * **Ala Este (Fumadores)**: Si fuma, accede a la sala vidriada con ventilación 100%.
  * **Terraza (Sky Bar)**: Si prefiere aire libre y coctelería con vista a la calle.

### Paso 10: Aplicación de Promoción "Tiempo de Espera"
* Al presentar el ticket de lavado en la barra del Casino o el Sky Bar:
  * El bartender escanea el código y aplica la promoción de cortesía: 1 cóctel artesanal bonificado o 2x1 en cervezas seleccionadas.
  * En casino: acreditación automática de 500 fichas/créditos promocionales para tragamonedas o mesas en vivo mientras dure el lavado.

### Paso 11: Pantallas Sincronizadas con Estado del Lavado
* Monitores ultra-panorámicos ubicados sobre la barra, en la sala de fumadores y en la marquesina de la terraza muestran el tablero en vivo:
  * Identificador de tambor (`LAV-01` a `LAV-07`, `SEC-01` a `SEC-10`).
  * Barra de progreso porcentual y cuenta regresiva en minutos.
  * Código de ticket del cliente para retiro seguro.

### Paso 12: Control de Mantenimiento Periódico
* **Cartas / Mazos**: Rotación y reemplazo preventivo cada 24 horas de uso continuo en mesas de blackjack y póker.
* **Dados y Croupier Kits**: Reemplazo y calibración dimensional cada 48 horas.
* **Nivel de Insumos**: Sensores de ultrasonido / nivel en tanques de jabón y suavizante para evitar desabastecimiento en medio de ciclos.

### Paso 13: Alerta "Listo para Retirar"
* Cuando el tambor finaliza el centrifugado / enfriamiento, el servidor despacha alertas simultáneas:
  * Aviso sonoro suave y cambio a color verde esmeralda en los monitores del Bar y Terraza: *"Ticket JW-9821-X listo en Lavadora 3"*.
  * Notificación push / SMS opcional al teléfono del usuario.
* El cliente retira sus prendas limpias y secas; puede solicitar servicio de doblado express en mesada.

### Paso 14: Arqueo de Caja Independiente por Unidad
* Al cierre de turno o corte horario:
  * Unidad Lavandería: Arqueo de recaudación física en billeteros vs. transacciones reportadas por API Mercado Pago.
  * Unidad Casino: Conteo de drop boxes de mesas, cálculo de rake y recaudación de tragamonedas.
  * Unidad Bar & Terraza: Cierre de comandas de coctelería y venta de snacks.
* Generación de balance independiente para cada unidad de negocio y consolidación en el reporte del Gerente General.

### Paso 15: Cierre Nocturno e Inspección Final
* Descarga de tolvas de monedas, corte de agua y energía en solenoides de lavandería.
* Bloqueo físico de bandejas de ruleta y almacenamiento de fichas en caja fuerte blindada.
* Sanitización final de mesas, pisos y apagado secuencial de luminarias de terraza, manteniendo solo neones de fachada en modo bajo consumo 24 h.

---

## 2. Arquitectura de Hardware y Red

```
 [Panel Táctil 14"] ──USB──► [Raspberry Pi Kiosco] ──WiFi/LAN──► [Servidor Central WebSocket]
         │                              │                                      │
 [Billetero Arduino] ──Serial───────────┘                                      │
         │                                                                     ▼
 [Puente H L298N] ──Relé──► Bombas Insumos / Solenoides       [Displays TV Bar / Terraza / Casino]
```

* **Microcontrolador Arduino**: Lectura analógica/digital en tiempo real, manejo de pulsos de monedas/billetes y modulación PWM en puentes H para inyección de líquidos.
* **Raspberry Pi**: Interfaz gráfica en pantalla de 14", procesamiento de cobros QR Mercado Pago y puente de red seguro mediante WebSockets (WSS).
* **Servidor Central**: Gestión de colas de lavado, estado del jackpot progresivo, base de datos transaccional y sincronización multi-pantalla.
