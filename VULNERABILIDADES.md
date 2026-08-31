# Análisis y remediación de vulnerabilidades — Frontend Angular

**Proyecto:** `ecommerce-angular-14` (repositorio `cidaluna/ecommerce-angular-14`)
**Migración:** Angular **14.3.0 → 20.3.30**
**Herramienta:** Trivy 0.74.0 (`fs`, modo SCA)
**Resultado:** de **17 hallazgos a 0**, en todas las severidades.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Qué es esta aplicación](#2-qué-es-esta-aplicación)
3. [Cómo se hizo el escaneo](#3-cómo-se-hizo-el-escaneo)
4. [Los 17 hallazgos, agrupados por familia](#4-los-17-hallazgos-agrupados-por-familia)
5. [Análisis de riesgo real: qué es explotable aquí](#5-análisis-de-riesgo-real-qué-es-explotable-aquí)
6. [La decisión: por qué había que migrar 6 versiones mayores](#6-la-decisión-por-qué-había-que-migrar-6-versiones-mayores)
7. [Qué se cambió exactamente](#7-qué-se-cambió-exactamente)
8. [Los 2 hallazgos que quedan y por qué](#8-los-2-hallazgos-que-quedan-y-por-qué)
9. [Verificación (incluida la de no-regresión)](#9-verificación-incluida-la-de-no-regresión)
10. [Cómo reproducirlo](#10-cómo-reproducirlo)

---

## 1. Resumen ejecutivo

| | Antes | Después |
|---|---|---|
| CRITICAL | 0 | **0** |
| HIGH | **13** | **0** |
| MEDIUM | **4** | **0** |
| LOW | 0 | **0** |
| **Total** | **17** | **0** |

Las 17 vulnerabilidades estaban en **3 paquetes**, todos dependencias **directas** y todos del
núcleo de Angular: `@angular/core`, `@angular/common` y `@angular/compiler`, versión 14.3.0.

**No existía parche para la rama 14.** Angular 14 salió del soporte hace años y ninguna de las
17 tiene un backport. La versión mínima que las cierra todas es **Angular 20.3.27**. Por tanto la
remediación **obligaba a migrar**; no había atajo con `overrides` ni `resolutions`.

Se eligió **Angular 20.3.30** (última de la línea LTS 20.3.x) por encima de la 22.1.4:
cierra las 17 igual, atraviesa dos saltos de major menos y tiene soporte de seguridad activo.

**Coste real del cambio en código de aplicación: 7 líneas.**

---

## 2. Qué es esta aplicación

Conviene aclararlo porque condiciona todo el análisis de riesgo:

- Tienda de comercio electrónico construida con Angular CLI 14.2.1.
- **Consume la API pública `https://fakestoreapi.com`** — no tiene backend propio.
  No está conectada al microservicio .NET de la otra mitad de esta prueba.
- Arquitectura **`NgModule` clásica**, no standalone.
- **575 líneas** de TypeScript repartidas en 8 componentes y 2 servicios.
- Usa 13 módulos de Angular Material y Tailwind CSS.

Ese tamaño reducido es lo que hizo viable la estrategia de migración elegida.

---

## 3. Cómo se hizo el escaneo

### Los comandos

```powershell
cd ecommerce-angular-14

# El criterio de aceptación de la prueba
trivy fs --scanners vuln --severity CRITICAL,HIGH .

# Sin filtro: todas las severidades
trivy fs --scanners vuln .

# Incluyendo dependencias de desarrollo
trivy fs --scanners vuln --include-dev-deps .
```

A diferencia del backend .NET, aquí **no hacen falta `--skip-dirs`**: el `package-lock.json` está
en la raíz y ya contiene el grafo completo de dependencias.

> **Cómo saber que estás escaneando bien:** la columna `Target` debe decir `package-lock.json`
> y el `Type` debe ser `npm`.

### Qué cuenta Trivy por defecto, y qué no

El analizador de `package-lock.json` de Trivy **excluye las `devDependencies` salvo que se le pida
lo contrario**. Conviene saberlo antes de leer cualquier cifra, porque el mismo proyecto arroja
números distintos según se active o no esa bandera:

| Comando | Alcance | Resultado inicial |
|---|---|---|
| `trivy fs --scanners vuln --severity CRITICAL,HIGH .` | Solo dependencias de runtime | **13 HIGH**, 0 CRITICAL |
| `trivy fs --scanners vuln .` | Runtime, todas las severidades | **17** (13 HIGH + 4 MEDIUM) |
| `trivy fs --scanners vuln --include-dev-deps .` | Runtime **+** herramientas de build | 17 + hallazgos de desarrollo |

Las dependencias de desarrollo —`@angular-devkit`, `karma`, `webpack-dev-server`, `less`— **nunca
se despliegan al navegador del usuario final**: solo se ejecutan en la máquina del desarrollador y
en el servidor de integración continua.

El criterio de aceptación de la prueba está redactado sobre el primer comando, de modo que el
objetivo eran esas **13 HIGH de runtime**. Aun así se auditaron también las de desarrollo con
`--include-dev-deps` — resultado en la sección 8.

**Distinguir "dependencia de runtime" de "dependencia de build" no es una excusa para ignorar
hallazgos: es priorización basada en superficie de exposición real.** Una vulnerabilidad en
`webpack-dev-server` no viaja al usuario; una en `@angular/core` sí.

---

## 4. Los 17 hallazgos, agrupados por familia

Las 17 se reparten en **4 familias** según el mecanismo del fallo. Agruparlas así es más útil
que listarlas por CVE, porque la remediación es común y el riesgo también.

### Familia A — XSS en el compilador de plantillas (5 hallazgos)

El grupo **más grave**. Angular sanitiza automáticamente lo que interpola en las plantillas;
estos CVEs describen formas de **burlar esa sanitización**.

| CVE | Sev | Paquete(s) | Mecanismo | Parche |
|---|---|---|---|---|
| CVE-2025-66412 | HIGH | `compiler` | XSS almacenado vía animación SVG, URL SVG y MathML | 20.3.15 |
| CVE-2026-22610 | HIGH | `compiler`, `core` | XSS en el compilador de plantillas | 20.3.16 |
| CVE-2026-50557 | MEDIUM | `compiler`, `core` | Bypass de sanitización de *namespaces* de plantilla y atributo | 20.3.22 |
| CVE-2026-54265 | MEDIUM | `compiler` | Bypass de sanitización en binding bidireccional | 20.3.25 |
| CVE-2026-52725 | MEDIUM | `core` | XSS vía creación dinámica de componentes | 20.3.22 |

### Familia B — `HttpTransferCache` (4 hallazgos)

Caché que Angular usa para que el navegador no repita las peticiones HTTP que ya hizo el
servidor durante el renderizado en servidor (SSR).

| CVE | Sev | Paquete | Mecanismo | Parche |
|---|---|---|---|---|
| CVE-2026-50170 | HIGH | `common` | Fuga de información: cachea por defecto peticiones con credenciales | 20.3.22 |
| CVE-2026-54266 | HIGH | `common` | Hash de 32 bits débil en las claves de caché → colisiones entre peticiones | 20.3.25 |
| CVE-2026-68945 | HIGH | `common` | Reutilización de respuesta entre peticiones y envenenamiento de estado | **20.3.27** |
| CVE-2026-54267 | HIGH | `core` | DOM clobbering en hidratación + envenenamiento de caché de respuesta | 20.3.25 |

> CVE-2026-68945 es **la que fija el suelo de la migración**: exige 20.3.27 como mínimo.

### Familia C — Internacionalización (2 hallazgos)

| CVE | Sev | Paquete(s) | Mecanismo | Parche |
|---|---|---|---|---|
| CVE-2026-27970 | HIGH | `core` | XSS vía ficheros de traducción comprometidos | 20.3.17 |
| CVE-2026-69151 | HIGH | `compiler`, `core` | XSS vía manejadores de eventos de i18n | 20.3.27 |

### Familia D — Denegación de servicio y fuga en `@angular/common` (3 hallazgos)

| CVE | Sev | Paquete | Mecanismo | Parche |
|---|---|---|---|---|
| CVE-2025-66035 | HIGH | `common` | Fuga del token XSRF hacia dominios externos vía URLs *protocol-relative* (`//evil.com`) | 20.3.14 |
| CVE-2026-50171 | HIGH | `common` | DoS mediante parámetro `digitsInfo` malformado en `DecimalPipe` | 20.3.22 |
| CVE-2026-54268 | HIGH | `common` | DoS mediante cadena de formato de fecha manipulada en `DatePipe` | 20.3.25 |

---

## 5. Análisis de riesgo real: qué es explotable aquí

Una severidad CVSS mide el fallo **en abstracto**. Lo que importa para priorizar es si el código
vulnerable **se ejecuta en esta aplicación concreta**. Se auditó el código fuente para
determinarlo:

```bash
grep -rn "innerHTML|bypassSecurity|DomSanitizer" src/     # → ninguno
grep -rn "provideClientHydration|TransferState" src/      # → ninguno
grep -rn "i18n|\$localize|loadTranslations" src/          # → ninguno
grep -rn "HttpClient" src/                                # → sí, contra fakestoreapi.com
```

### Resultado del análisis

| Familia | ¿Aplica aquí? | Razonamiento |
|---|---|---|
| **A — XSS en compilador** | 🔴 **SÍ, riesgo real** | La app renderiza títulos, descripciones y URLs de imagen que vienen de `fakestoreapi.com`, **una API externa que no controlamos**. Ese es exactamente el vector de contenido no confiable que estos CVEs explotan |
| **B — HttpTransferCache** | 🟢 No | Esa caché **solo se activa con SSR e hidratación**. La app es puramente cliente: no hay `provideClientHydration`, no hay `@angular/ssr`, no hay `TransferState`. El código vulnerable nunca se ejecuta |
| **C — i18n** | 🟢 No | La app no usa internacionalización: sin `$localize`, sin ficheros de traducción, sin `loadTranslations` |
| **D — DoS en pipes / XSRF** | 🟡 Parcial | `DecimalPipe` y `DatePipe` reciben formatos **fijos, escritos en las plantillas**, no controlados por el usuario → sin superficie de DoS. El XSRF token leakage tampoco aplica: la app no envía credenciales ni usa protección XSRF |

### Un matiz importante sobre la Familia A

La app **no usa `innerHTML` ni `bypassSecurityTrustHtml`**. Eso es una buena práctica: significa
que no hay ninguna puerta trasera abierta manualmente, y que toda la seguridad descansa en la
sanitización automática de Angular.

Pero eso es justamente **por lo que estos CVEs importan tanto aquí**: el único muro de defensa
contra el contenido de `fakestoreapi.com` es el sanitizador del compilador. Si ese sanitizador se
puede burlar —que es precisamente lo que describen los 5 CVEs de la Familia A— entonces no queda
nada más protegiendo la aplicación.

### Conclusión de la priorización

**5 de 17 tienen riesgo real y directo. Las 12 restantes son código muerto en este contexto.**

Aun así **se remediaron las 17**, porque:

1. La remediación es **la misma acción** para todas: subir Angular. No hay coste incremental.
2. El análisis de superficie **es una foto de hoy**. Si mañana alguien añade SSR o
   internacionalización, las Familias B y C se activan sin que nadie recuerde revisarlo.
3. **Las librerías vulnerables viajan en el bundle desplegado**, se ejecuten o no.

---

## 6. La decisión: por qué había que migrar 6 versiones mayores

### No había alternativa a la migración

Se comprobó, CVE por CVE, la versión con parche más antigua disponible:

```
CVE-2025-66035  ->  19.2.16 / 20.3.14 / 21.0.1
CVE-2026-22610  ->  19.2.18 / 20.3.16 / 21.0.7
CVE-2026-68945  ->  20.3.27 / 21.2.19 / 22.0.2   <- la más exigente
```

**Ninguna tiene backport a la rama 14.** No existe una versión 14.x parcheada, así que técnicas
como `overrides` o `resolutions` en `package.json` —que sirven para forzar una versión concreta
de una transitiva— **no tenían nada a lo que apuntar**.

### Elección de versión destino

| Opción | Cierra las 17 | Saltos de major | Soporte |
|---|---|---|---|
| Angular 19.2.23 | Sí | 5 | Fin de soporte más próximo |
| **Angular 20.3.30** ✅ | **Sí** | **6** | **LTS activo** |
| Angular 22.1.4 | Sí | 8 | Actual, vida útil más larga |

Se eligió **20.3.30**: el mínimo exigido era 20.3.27, es la línea LTS con soporte de seguridad
activo, y evita dos saltos de major adicionales (21 y 22) con su riesgo asociado. Compatible con
el Node 24.15 del entorno.

### Elección de técnica: *big bang* en vez de `ng update` escalonado

| | `ng update` escalonado | *Big bang* |
|---|---|---|
| Cómo | 14→15→16→17→18→19→20, un major a la vez | Reescribir `package.json` al destino y arreglar lo que rompa |
| Ventaja | Ejecuta *schematics* de migración automática de código | Mucho más rápido |
| Coste | 6 ciclos de `npm install` + build + commit | Cambios de API a mano |

Se eligió **big bang** por el tamaño del proyecto: **575 líneas y 8 componentes**. Los
*schematics* automáticos aportan poco cuando hay tan poco código que migrar, y el ahorro de
tiempo es sustancial.

**La apuesta salió bien: la migración de 6 majors rompió una sola cosa.**

En un proyecto grande (decenas de miles de líneas, dependencias de terceros acopladas a APIs de
Angular) la recomendación sería la contraria: `ng update` escalonado, validando en cada peldaño.

---

## 7. Qué se cambió exactamente

### `package.json`

```diff
 "dependencies": {
-  "@angular/animations": "^14.0.0",
-  "@angular/cdk": "^13.0.0",          <- desalineado con el core desde el repo original
-  "@angular/common": "^14.0.0",
-  "@angular/compiler": "^14.0.0",
-  "@angular/core": "^14.0.0",
-  "@angular/forms": "^14.0.0",
-  "@angular/material": "^13.0.0",     <- ídem
-  "@angular/platform-browser": "^14.0.0",
-  "@angular/platform-browser-dynamic": "^14.0.0",
-  "@angular/router": "^14.0.0",
-  "rxjs": "~7.5.0",
-  "zone.js": "~0.11.4"
+  "@angular/animations": "^20.3.30",
+  "@angular/cdk": "^20.2.14",
+  "@angular/common": "^20.3.30",
+  "@angular/compiler": "^20.3.30",
+  "@angular/core": "^20.3.30",
+  "@angular/forms": "^20.3.30",
+  "@angular/material": "^20.2.14",
+  "@angular/platform-browser": "^20.3.30",
+  "@angular/platform-browser-dynamic": "^20.3.30",
+  "@angular/router": "^20.3.30",
+  "rxjs": "~7.8.0",
+  "zone.js": "~0.15.1"
 },
+"overrides": {
+  "uuid": "^11.1.1"
+},
 "devDependencies": {
-  "@angular-devkit/build-angular": "^14.2.1",
-  "@angular/cli": "~14.2.1",
-  "@angular/compiler-cli": "^14.0.0",
-  "typescript": "~4.7.2",
-  "@types/jasmine": "~4.0.0",
-  "jasmine-core": "~4.3.0",
+  "@angular-devkit/build-angular": "^20.3.35",
+  "@angular/cli": "~20.3.35",
+  "@angular/compiler-cli": "^20.3.30",
+  "typescript": "~5.9.3",
+  "@types/jasmine": "~5.1.0",
+  "jasmine-core": "~5.9.0",
 }
```

> **Hallazgo lateral:** `@angular/cdk` y `@angular/material` estaban en **13** mientras el core
> estaba en **14**. Venían desalineados del repositorio original. Se corrigió alineando ambos a
> la misma familia que el core.

### El único cambio de código: `standalone: false` (7 archivos)

Tras instalar Angular 20, el build falló con:

```
error NG6008: Component AppComponent is standalone,
and cannot be declared in an NgModule. Did you mean to import it instead?
```

**Causa.** Angular 19 cambió el valor por defecto de `standalone` de `false` a `true`. Los
componentes de esta app se declaran en un `NgModule`, así que hay que marcarlos explícitamente:

```diff
 @Component({
+  standalone: false,
   selector: 'app-root',
   templateUrl: './app.component.html',
   styleUrls: ['./app.component.css']
 })
 export class AppComponent implements OnInit {
```

Aplicado a los 7 componentes. **Una línea cada uno. Cero cambios de lógica de negocio.**

> Alternativa descartada: convertir la app a componentes *standalone* (el modelo moderno de
> Angular). Es lo que recomienda Angular hoy, pero **está fuera del alcance de esta prueba**, que
> pide remediar vulnerabilidades sin romper el funcionamiento. Refactorizar la arquitectura
> mezclaría dos cambios distintos en el mismo commit y dificultaría atribuir cualquier regresión.

### Configuración

**`tsconfig.json`** — Angular 20 exige ES2022:

```diff
-  "moduleResolution": "node",
-  "target": "es2020",
-  "module": "es2020",
-  "lib": ["es2020", "dom"]
+  "moduleResolution": "bundler",
+  "target": "ES2022",
+  "module": "ES2022",
+  "lib": ["ES2022", "dom"]
```

**`angular.json`** — tres opciones cambiaron de forma entre v14 y v20:

```diff
-  "polyfills": "src/polyfills.ts"          // string, con fichero propio
+  "polyfills": ["zone.js"]                 // array de módulos

-  "browserTarget": "...:build:production"  // eliminado en v18
+  "buildTarget": "...:build:production"

   "budgets": [{ "type": "initial",
-    "maximumWarning": "500kb", "maximumError": "1mb" }]
+    "maximumWarning": "1mb",   "maximumError": "2mb" }]
```

El ajuste de *budgets* merece justificación: el bundle pasó de 668 kB a 867 kB. **No es
hinchazón por la migración**, sino que Angular 20 + Material 20 incluyen más código base que sus
equivalentes de 2022. El presupuesto original de 500 kB ya se excedía **antes** de migrar (el
build de Angular 14 también emitía ese warning), así que se elevó a un valor realista en lugar de
dejar un build con advertencias permanentes.

**Ficheros eliminados** — Angular 15+ ya no los usa:

```
src/polyfills.ts    (reemplazado por "polyfills": ["zone.js"] en angular.json)
src/test.ts         (el builder de Karma descubre los .spec.ts automáticamente)
```

Con sus referencias limpiadas en `tsconfig.app.json` y `tsconfig.spec.json`.

### Resumen del diff

```
 package.json                        |  43 +-
 package-lock.json                   | 17473 +++++-----
 src/app/**/*.component.ts (7)       |   7 +      <- standalone: false
 src/polyfills.ts                    |  53 -      <- eliminado
 src/test.ts                         |  26 -      <- eliminado
 angular.json                        |   6 +-
 tsconfig.json                       |   8 +-
 tsconfig.app.json                   |   3 +-
 tsconfig.spec.json                  |   4 -
```

---

## 8. Los 2 hallazgos que quedan y por qué

Con el escaneo por defecto —el del criterio de aceptación— el resultado es **0**. Pero al forzar
la auditoría de dependencias de desarrollo aparecen 2, y conviene documentarlas en vez de
esconderlas tras el filtro:

```powershell
trivy fs --scanners vuln --include-dev-deps .
```

```
Total: 2 (MEDIUM: 0, HIGH: 2, CRITICAL: 0)
```

### `image-size` 0.5.5 — CVE-2025-71329 y CVE-2025-71330 (HIGH)

**Cadena de dependencia, trazada con `npm ls`:**

```
ecommerce-angular-14
└─┬ @angular-devkit/build-angular@20.3.35
  └─┬ less@4.4.0
    └── image-size@0.5.5
```

**Por qué NO se remedia:**

1. **No existe parche, y se comprobó empíricamente.** El estado que reporta Trivy es `affected` y
   la columna *Fixed Version* está **vacía**. Para no quedarse en la lectura del informe, se forzó
   la instalación de la **última versión publicada** mediante un override:

   ```json
   "overrides": { "image-size": "^2.0.2" }
   ```

   Resultado del escaneo tras reinstalar:

   ```
   │ image-size │ CVE-2025-71329 │ HIGH │ affected │ 2.0.2 │  (Fixed Version vacía)
   │            │ CVE-2025-71330 │      │ affected │ 2.0.2 │
   ```

   **Ninguna versión publicada está corregida: ni la 0.5.5, ni la rama 1.x, ni la 2.0.2.**
   El override se revirtió porque introducía un riesgo real —`less` declara `~0.5.0` y la API de
   `image-size` 2.x es incompatible con la forma en que la invoca— a cambio de cero ganancia de
   seguridad. No es una decisión de conveniencia: es una imposibilidad técnica verificada.
2. **Es una `devDependency`.** `image-size` es una dependencia de `less`, el preprocesador CSS que
   viene dentro del compilador de Angular. **No se incluye en el bundle** que llega al navegador.
3. **Superficie de explotación prácticamente nula.** El fallo es una denegación de servicio al
   procesar un buffer de imagen malformado. Para dispararlo alguien tendría que introducir una
   imagen hostil en el proceso de compilación — y quien pueda hacer eso ya tiene control del
   pipeline de build, un compromiso mucho mayor que un DoS.
4. **Esta app ni siquiera usa Less.** Los estilos son CSS plano y Tailwind. La rama de código de
   `less` nunca se ejecuta.

**Vías descartadas y su motivo:**

| Vía | Por qué no |
|---|---|
| `override` de `image-size` | **Probado.** Forzada la 2.0.2, la última publicada: sigue marcada como `affected`. No hay versión parcheada a la que apuntar |
| Bajar `@angular-devkit/build-angular` | Las versiones anteriores traen la misma `less`, y además reintroduciría los CVEs de Angular que acabamos de cerrar |
| Migrar al builder `@angular/build` | Arrastra la misma cadena de dependencias |
| `.trivyignore` a secas | **Descartado.** Un fichero con solo los identificadores hace desaparecer el hallazgo sin dejar rastro ni motivo. Eso es silenciar, no aceptar |

**Lo que sí se hizo: aceptación formal del riesgo.** Ver el apartado siguiente.

#### Aceptación documentada en `.trivyignore.yaml`

No remediar no puede significar ignorar. Se declaró el riesgo de forma explícita usando el
formato estructurado de Trivy, que admite motivo y fecha de caducidad:

```yaml
vulnerabilities:
  - id: CVE-2025-71329
    paths: ["package-lock.json"]
    statement: >-
      SIN PARCHE DISPONIBLE: verificado forzando la ultima version (2.0.2)...
      EXPOSICION: devDependency, no entra en el bundle, la app no usa Less...
      SEGUIMIENTO: Dependabot avisara cuando build-angular publique el fix.
    expired_at: 2026-12-01
```

La diferencia con silenciarlo es sustancial:

| | `.trivyignore` a secas | `.trivyignore.yaml` con motivo y caducidad |
|---|---|---|
| ¿Consta el motivo? | No | Sí, en el propio repositorio |
| ¿Se revisa alguna vez? | Nunca | **Al caducar reaparece y obliga a decidir de nuevo** |
| ¿Es auditable? | Se pierde el rastro | `trivy --show-suppressed` lo lista con su justificación |

Comprobado:

```
$ trivy fs --scanners vuln --include-dev-deps --show-suppressed .

Suppressed Vulnerabilities (Total: 2)
│ image-size │ CVE-2025-71329 │ HIGH │ ignored │ <justificación> │ .trivyignore.yaml │
```

**Ámbito de la excepción.** Solo aplica al escaneo con `--include-dev-deps`. El gate de
`CRITICAL,HIGH` sobre dependencias de runtime —el del criterio de aceptación— **no tiene ninguna
exclusión** y sigue dando 0 por mérito propio.

**Efecto en el pipeline.** Con la excepción aplicada, el paso de dependencias de desarrollo pasó
a ser **bloqueante**. Hoy está en verde, pero fallará si aparece una vulnerabilidad nueva en las
herramientas de compilación, o si la aceptación caduca sin que nadie la revise. Un paso
meramente informativo no daría ninguna de esas dos alarmas.

**Seguimiento recomendado:** vigilar el repositorio de `image-size` y actualizar
`@angular-devkit/build-angular` en cuanto publique una versión con la dependencia corregida.
Dependabot (configurado como extra de esta prueba) avisará automáticamente.

### `uuid` 8.3.2 — CVE-2026-41907 (MEDIUM) — ✅ SÍ remediada

```
└─┬ webpack-dev-server@5.2.6
  └─┬ sockjs@0.3.24
    └── uuid@8.3.2
```

Esta **sí** tenía parche (11.1.1), así que se cerró con un `override` en `package.json`:

```json
"overrides": {
  "uuid": "^11.1.1"
}
```

Verificado tras aplicarlo: `npm ls uuid` resuelve a **11.1.1**, y tanto `ng build` como
`ng serve` siguen funcionando — importante, porque el override toca el servidor de desarrollo.

---

## 9. Verificación (incluida la de no-regresión)

### Escaneos

| Comprobación | Resultado |
|---|---|
| `trivy fs --scanners vuln --severity CRITICAL,HIGH .` | ✅ **0** |
| `trivy fs --scanners vuln .` (todas las severidades) | ✅ **0** |
| `trivy fs --scanners vuln --include-dev-deps .` | ⚠️ 2 (justificadas en §8) |

### Compilación y ejecución

| Comprobación | Resultado |
|---|---|
| `ng build` | ✅ 0 errores, **0 advertencias** |
| `ng serve` | ✅ compila y sirve en `localhost:4200` |
| HTML servido | ✅ `<title>E-commerce Luna</title>` |
| `ng test --watch=false --browsers=ChromeHeadless` | ✅ **33 SUCCESS** |

### Tests unitarios — de 9 fallando a 33 pasando

**Estado final: `TOTAL: 33 SUCCESS`.**

| | Tests | Resultado |
|---|---|---|
| Angular 14 original (repo upstream) | 11 | ❌ 9 FAILED, 2 SUCCESS |
| Angular 20 recién migrado | 11 | ❌ 9 FAILED, 2 SUCCESS |
| Angular 20 con los specs corregidos | **33** | ✅ **33 SUCCESS** |

#### Primero: verificación de no-regresión

Tras la migración, `ng test` reportaba **9 FAILED / 2 SUCCESS**. Antes de atribuir eso al cambio
de dependencias, se verificó empíricamente el estado original en lugar de suponerlo:

```bash
# Se restauró el proyecto Angular 14 intacto desde git en un directorio temporal
git archive HEAD | tar -x -C /tmp/ng14-baseline
cd /tmp/ng14-baseline && npm install
npx ng test --watch=false --browsers=ChromeHeadless
```

**Resultado comparado:**

```
Angular 14 original  ->  TOTAL: 9 FAILED, 2 SUCCESS
Angular 20 migrado   ->  TOTAL: 9 FAILED, 2 SUCCESS
```

**Idéntico. La migración no introdujo ninguna regresión.** Los tests ya venían rotos del
repositorio original.

#### Segundo: dos causas raíz distintas

**Causa A — specs incompletos (7 de los 9 fallos).** Los specs son los generados automáticamente
por el Angular CLI, que declaran únicamente el componente bajo prueba sin importar los módulos de
Material que sus plantillas necesitan:

```typescript
await TestBed.configureTestingModule({
  declarations: [ FiltersComponent ]   // faltan MatExpansionModule, MatListModule...
}).compileComponents();
```

De ahí `NG0304: 'mat-expansion-panel' is not a known element`.

**Causa B — aserciones sobre el andamiaje del CLI (2 fallos).** `app.component.spec.ts` conservaba
las comprobaciones de la plantilla por defecto de `ng new`, que hacía años que no existía:

```typescript
expect(app.title).toEqual('ecommerce-angular-14');           // el título real es 'E-commerce Luna'
expect(compiled.querySelector('.content span')?.textContent)
  .toContain('ecommerce-angular-14 app is running!');        // ese elemento ya no existe
```

#### Tercero: la corrección

Se reescribieron los 9 specs proporcionando a cada `TestBed` exactamente los módulos que su
plantilla necesita, y se sustituyeron las aserciones obsoletas por otras que comprueban
comportamiento real:

| Spec | Módulos añadidos | Aserciones nuevas |
|---|---|---|
| `app.component` | Toolbar, Icon, Menu, Badge, Button, SnackBar, Router | título real, carrito vacío al inicio, renderiza `<app-header>` |
| `header.component` | Toolbar, Icon, Menu, Badge, Button, SnackBar, Router | recalcula la cantidad de artículos al cambiar el `@Input` |
| `home.component` | Sidenav, GridList, Card, Icon, Menu, Expansion, List + hijos declarados | 4 columnas por defecto, `rowHeight` cambia con las columnas |
| `cart.component` | Card, Icon, Table, Button, Router | columnas de la tabla, cálculo del total |
| `filters.component` | Expansion, List | categorías expuestas, emite la categoría seleccionada |
| `product-box.component` | Card, Icon, Button | modo ancho por defecto, emite el producto al añadir |
| `products-header.component` | Card, Icon, Menu, Button | orden y conteo iniciales, actualización de ambos |
| `cart.service` | SnackBar, NoopAnimations | añadir, duplicar cantidad, total, vaciar, eliminar |
| `store.service` | `provideHttpClient` + `provideHttpClientTesting` | URL y método de la petición, parámetros `limit`/`sort` |

Dos detalles de API que cambian en Angular 20 y conviene registrar:

- `HttpClientTestingModule` está **deprecado**. La forma actual es
  `providers: [provideHttpClient(), provideHttpClientTesting()]`.
- `RouterTestingModule` se sustituye por `provideRouter([])` más importar `RouterModule` para
  disponer de las directivas `routerLink` y `router-outlet`.
- Se usa `NoopAnimationsModule` en lugar de `BrowserAnimationsModule`: los componentes de Material
  requieren un proveedor de animaciones, pero en tests interesa desactivarlas para que no
  introduzcan asincronía.

`store.service.spec.ts` incluye además `httpMock.verify()` en el `afterEach`, que falla el test si
queda alguna petición HTTP pendiente sin declarar — así el spec no puede pasar por accidente.

> **Por qué esto se documenta aparte de la remediación.** Corregir los tests **no era necesario**
> para cumplir el criterio de aceptación de la prueba, y es trabajo de calidad, no de seguridad.
> Se hizo como mejora adicional y se registra por separado para que quede claro qué cambios
> responden a un CVE y cuáles son deuda técnica heredada del repositorio original.

### Evidencia archivada

Los informes están versionados en este repositorio, en la carpeta `reports/`:

- **Pre-análisis** (línea base, Angular 14.3.0): `reports/pre/`
- **Post-análisis** (estado remediado, Angular 20.3.30): `reports/post/`

```
reports/
├── pre/
│   ├── angular.txt                           13 HIGH en Angular 14.3.0 (tabla)
│   └── angular.json                          el mismo escaneo en JSON
└── post/
    ├── angular.txt                           0 — criterio de aceptación
    ├── angular.json                          el mismo escaneo en JSON
    ├── angular-all-severities.txt            0 — sin filtro de severidad
    └── angular-con-dev-deps.txt              2 — las justificadas en §8
```

---

## 10. Cómo reproducirlo

### Requisitos

- Node.js 20.19+, 22.12+ o 24 (probado con **24.15.0**)
- Trivy (`winget install -e --id AquaSecurity.Trivy`)

### Instalar y verificar

```powershell
cd "<repo>\ecommerce-angular-14"
npm install
```

### Escaneo — criterio de aceptación

```powershell
trivy fs --scanners vuln --severity CRITICAL,HIGH .
```

Salida esperada: `Vulnerabilities: 0`, con `Target = package-lock.json` y `Type = npm`.

### Escaneo sin filtro de severidad

```powershell
trivy fs --scanners vuln .
```

### Escaneo incluyendo dependencias de desarrollo

```powershell
trivy fs --scanners vuln --include-dev-deps .
```

Salida esperada: 2 HIGH en `image-size`, justificadas en la sección 8.

### Gate para CI

```powershell
trivy fs --scanners vuln --severity CRITICAL,HIGH --exit-code 1 .
echo "Exit code: $LASTEXITCODE"
```

Debe imprimir `Exit code: 0`.

### Compilar y ejecutar

```powershell
npm run build      # ng build
npm start          # ng serve -> http://localhost:4200
```

### Ejecutar los tests

```powershell
npx ng test --watch=false --browsers=ChromeHeadless
```

Salida esperada: `TOTAL: 33 SUCCESS`.

Si Karma no encuentra el navegador, indícaselo:

```powershell
$env:CHROME_BIN = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

### Trazar el origen de una dependencia vulnerable

```powershell
npm ls <paquete> --all
```

---

## Apéndice — Tabla completa de los 17 hallazgos

| # | Sev | CVE | Paquete | Familia | ¿Explotable aquí? | Parche mínimo |
|---|---|---|---|---|---|---|
| 1 | HIGH | CVE-2025-66412 | `@angular/compiler` | A · XSS compilador | 🔴 Sí | 20.3.15 |
| 2 | HIGH | CVE-2026-22610 | `@angular/compiler` | A · XSS compilador | 🔴 Sí | 20.3.16 |
| 3 | HIGH | CVE-2026-22610 | `@angular/core` | A · XSS compilador | 🔴 Sí | 20.3.16 |
| 4 | MEDIUM | CVE-2026-50557 | `@angular/compiler` | A · XSS compilador | 🔴 Sí | 20.3.22 |
| 5 | MEDIUM | CVE-2026-50557 | `@angular/core` | A · XSS compilador | 🔴 Sí | 20.3.22 |
| 6 | MEDIUM | CVE-2026-54265 | `@angular/compiler` | A · XSS compilador | 🔴 Sí | 20.3.25 |
| 7 | MEDIUM | CVE-2026-52725 | `@angular/core` | A · XSS compilador | 🔴 Sí | 20.3.22 |
| 8 | HIGH | CVE-2026-50170 | `@angular/common` | B · TransferCache | 🟢 No — sin SSR | 20.3.22 |
| 9 | HIGH | CVE-2026-54266 | `@angular/common` | B · TransferCache | 🟢 No — sin SSR | 20.3.25 |
| 10 | HIGH | CVE-2026-68945 | `@angular/common` | B · TransferCache | 🟢 No — sin SSR | **20.3.27** |
| 11 | HIGH | CVE-2026-54267 | `@angular/core` | B · TransferCache | 🟢 No — sin SSR | 20.3.25 |
| 12 | HIGH | CVE-2026-27970 | `@angular/core` | C · i18n | 🟢 No — sin i18n | 20.3.17 |
| 13 | HIGH | CVE-2026-69151 | `@angular/compiler` | C · i18n | 🟢 No — sin i18n | 20.3.27 |
| 14 | HIGH | CVE-2026-69151 | `@angular/core` | C · i18n | 🟢 No — sin i18n | 20.3.27 |
| 15 | HIGH | CVE-2025-66035 | `@angular/common` | D · Fuga XSRF | 🟡 Sin credenciales | 20.3.14 |
| 16 | HIGH | CVE-2026-50171 | `@angular/common` | D · DoS `DecimalPipe` | 🟡 Formatos fijos | 20.3.22 |
| 17 | HIGH | CVE-2026-54268 | `@angular/common` | D · DoS `DatePipe` | 🟡 Formatos fijos | 20.3.25 |

**Las 17 remediadas** con una única acción: `@angular/*` 14.3.0 → **20.3.30**.

Hallazgos de `devDependencies` no remediados: **1** (`image-size`, sin parche disponible),
justificado individualmente en la sección 8.
