import { createFileRoute } from "@tanstack/react-router";
import { ComputerVisionLab } from "@/components/lab/applied-ai-labs";
import { LabShell } from "@/components/lab/lab-shell";
export const Route = createFileRoute("/lab/ai/computer-vision")({ component: Page });
function Page(){return <LabShell crumb="Computer Vision"><div className="mb-8 max-w-3xl"><span className="font-mono text-xs text-primary">AI LAB / 05</span><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Computer Vision Lab</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Synthetic feature-map and confidence-threshold experiments for image-classification workflows.</p></div><ComputerVisionLab /></LabShell>}
