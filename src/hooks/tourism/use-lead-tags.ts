import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateLeadDetails } from "@/services/crm.functions";

export function useLeadTags(
  leadId: string | undefined,
  qc: QueryClient,
) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("var(--color-blue-500)");

  async function addTag(list: string[] | undefined) {
    if (!leadId || !newTagName.trim()) return;
    const tagString = `${newTagName.trim()}:${newTagColor}`;
    const currentList = list || [];
    if (currentList.includes(tagString)) return toast.error("Tag já existe");
    const updated = [...currentList, tagString];
    try {
      await updateLeadDetails({ data: { leadId, tags: updated } });
      setNewTagName("");
      qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      qc.invalidateQueries({ queryKey: ["leads-crm"] });
      toast.success("Tag adicionada!");
    } catch (e) {
      toast.error("Falha ao adicionar tag");
    }
  }

  async function removeTag(list: string[] | undefined, tag: string) {
    if (!leadId) return;
    const currentList = list || [];
    const updated = currentList.filter((t) => t !== tag);
    try {
      await updateLeadDetails({ data: { leadId, tags: updated } });
      qc.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      qc.invalidateQueries({ queryKey: ["leads-crm"] });
    } catch (e) {
      toast.error("Falha ao remover tag");
    }
  }

  return {
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    addTag,
    removeTag,
  };
}
