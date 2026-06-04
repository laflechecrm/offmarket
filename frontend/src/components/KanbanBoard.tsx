"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users } from "lucide-react";
import { CRM_STAGES, CRM_STAGE_COLORS, EMPLOYEE_TRANCHES, type CrmCard, type CrmStage } from "@/types/company";
import { cn } from "@/lib/utils";

interface Props {
  cards: CrmCard[];
  onMove: (siren: string, fromStage: CrmStage, toStage: CrmStage) => void;
  onCardClick: (card: CrmCard) => void;
}

function KanbanCardItem({ card }: { card: CrmCard }) {
  const c = card.company_data;
  const empLabel = c.employee_tranche ? EMPLOYEE_TRANCHES[c.employee_tranche] : null;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-900 leading-tight">{c.name}</p>
        <p className="text-xs text-muted-foreground">{c.siren}</p>
      </div>
      {c.naf && (
        <Badge variant="secondary" className="text-xs">{c.naf}</Badge>
      )}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        {c.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{c.city}</span>}
        {empLabel && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{empLabel}</span>}
      </div>
      {c.enrichment && (
        <div className="text-xs font-semibold text-right text-muted-foreground">
          Score: {c.enrichment.cession_score.toFixed(0)}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ cards, onMove, onCardClick }: Props) {
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const fromStage = result.source.droppableId as CrmStage;
    const toStage = result.destination.droppableId as CrmStage;
    if (fromStage === toStage && result.source.index === result.destination.index) return;
    const siren = result.draggableId;
    onMove(siren, fromStage, toStage);
  }

  const cardsByStage = Object.fromEntries(
    CRM_STAGES.map((s) => [s, cards.filter((c) => c.stage === s)])
  ) as Record<CrmStage, CrmCard[]>;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {CRM_STAGES.map((stage) => {
          const stageCards = cardsByStage[stage];
          return (
            <div key={stage} className="flex flex-col w-64 shrink-0">
              {/* Column header */}
              <div className={cn("rounded-t-lg px-3 py-2 flex items-center justify-between", CRM_STAGE_COLORS[stage])}>
                <span className="text-xs font-semibold">{stage}</span>
                <span className="text-xs opacity-70">{stageCards.length}</span>
              </div>

              {/* Drop zone */}
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex-1 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[200px] transition-colors",
                      snapshot.isDraggingOver ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                    )}
                  >
                    {stageCards.map((card, index) => (
                      <Draggable key={card.siren} draggableId={card.siren} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onCardClick(card)}
                            className={cn("cursor-pointer", snapshot.isDragging && "opacity-80 rotate-1")}
                          >
                            <KanbanCardItem card={card} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {stageCards.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                        Glisser ici
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
