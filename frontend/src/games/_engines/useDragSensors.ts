"use client";

import { KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { KeyboardCoordinateGetter } from "@dnd-kit/core";

/**
 * Configuração única de sensors do dnd-kit pra todo drag-and-drop do Donc (jogos `order`,
 * `essay-collapse`, `classify`, `structure`). PointerSensor cobre mouse, touch e caneta com o
 * mesmo código — nunca adicionar `MouseSensor`/`TouchSensor` em paralelo, isso duplicaria a
 * ativação do gesto. `activationConstraint.distance` evita que um toque parado (tap) ou o início
 * de um scroll acidental já contem como início de drag.
 *
 * Área de arraste é o bloco inteiro (decisão de produto: sem handle dedicado) — em listas
 * verticais isso entra em conflito com rolar a página no touch; `distance` reduz mas não elimina
 * o atrito.
 *
 * `keyboardCoordinateGetter` é opcional: passe `sortableKeyboardCoordinates` (de
 * `@dnd-kit/sortable`) quando o contexto for uma `SortableContext`; omita em drag-and-drop entre
 * zonas soltas (`useDraggable`/`useDroppable` sem `SortableContext`).
 */
export function useDragSensors(options?: { keyboardCoordinateGetter?: KeyboardCoordinateGetter }) {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, options?.keyboardCoordinateGetter ? { coordinateGetter: options.keyboardCoordinateGetter } : undefined),
  );
}
