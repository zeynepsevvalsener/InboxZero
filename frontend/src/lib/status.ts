const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  processing: "Processing",
  done: "Completed",
  failed: "Failed",
  completed: "Completed",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
