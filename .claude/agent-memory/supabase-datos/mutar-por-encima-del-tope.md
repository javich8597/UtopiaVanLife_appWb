---
name: mutar-por-encima-del-tope
description: Al probar un bucle por tandas (storage.remove, paginación), los datos del test tienen que pasar del DOBLE del tope, o la mutación break/continue sobrevive sin ser inocua
metadata:
  type: feedback
---

Para validar un test sobre un bucle acotado (tandas de `storage.remove`, paginación, lotes de `insert`), los datos de prueba tienen que pasar del **doble** del tamaño de tanda, no llegar justo.

**Why:** el 2026-11-12 afirmé en un informe que mutar `break` por `continue` en el bucle de tandas «sobrevivía por inocua». Era falso. Lo probé con 150 archivos y tandas de 100, es decir exactamente dos tandas: fallando la segunda, `break` y `continue` borran los mismos 100 porque no hay tercera tanda. Con 250 archivos, `break` borra 100 y `continue` borra 150: la diferencia es real y grave (borra archivos que la respuesta no cuenta). `qa-verificador` lo mató con un test de tres tandas.

**How to apply:** antes de declarar que una mutación sobrevive, comprobar que el caso de prueba puede distinguirla. Con N elementos por tanda hacen falta al menos 2N+1 elementos y que falle una tanda INTERMEDIA. Y si una mutación «sobrevive», sospechar primero del test o de que la sustitución no se aplicó (comprobar el archivo con `grep` después de mutarlo) antes de concluir que el código da igual.
