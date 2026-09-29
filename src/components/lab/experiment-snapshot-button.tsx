import { useState } from "react";
import { Check, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveExperimentSnapshot } from "@/lib/experiment-history";

function fieldName(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, index: number) {
  if (el.name) return el.name;
  if (el.id) return el.id;
  const label = el.closest("label")?.textContent?.replace(/\s+/g, " ").trim();
  return label ? label.slice(0, 80) : `${el.tagName.toLowerCase()}-${index + 1}`;
}

function captureFields(root: HTMLElement) {
  const fields: Record<string, string | boolean> = {};
  const controls = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
  controls.forEach((el, i) => {
    const key = fieldName(el, i);
    fields[key] = el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? el.checked : el.value;
  });
  return fields;
}

export function ExperimentSnapshotButton({ module, route }: { module: string; route: string }) {
  const [saved, setSaved] = useState(false);

  function save() {
    const root = document.querySelector("main") ?? document.body;
    const fields = captureFields(root as HTMLElement);
    const summary = (root.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 8000);
    saveExperimentSnapshot({ module, route, fields, summary });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={save}>
      {saved ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
      {saved ? "Saved" : "Save experiment"}
    </Button>
  );
}
