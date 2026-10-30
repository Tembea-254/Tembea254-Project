export interface LiveWalk {
  id: string;
  title: string;
  destination: string;
  mode: string;
  scheduledAt: number;
  durationMin: number;
  streamUrl?: string;
  status: string;
  host: string;
}
