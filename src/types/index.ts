// Net2apps API Types
export interface Camera {
  name: string;
  enabled: boolean;
  width: number;
  height: number;
  fps: number;
}

export interface TimelineEvent {
  id: number;
  timestamp: number;
  camera: string;
  source: string;
  source_id: string;
  class_type: string;
  label: string;
  zones?: string[];
  snapshot_url?: string;
  data?: {
    sub_label?: string[];
    score?: number;
    box?: [number, number, number, number];
    zones?: string[];
  };
}

export interface Recording {
  id: string;
  camera: string;
  start_time: number;
  end_time: number;
  duration: number;
  objects: number;
  motion: number;
  video_url: string;
}

export interface Clip {
  id: string;
  camera: string;
  start_time: number;
  end_time: number;
  severity: string;
  duration: number;
  video_url: string;
  thumbnail_url: string;
  objects: string[];
  zones: string[];
}

export interface Snapshot {
  camera: string;
  timestamp: number;
  id: string;
  filename: string;
  is_clean: boolean;
  snapshot_url: string;
}

export interface Face {
  name: string;
  image_count: number;
  latest_image_url: string;
  images: Array<{
    filename: string;
    timestamp: number;
    url: string;
  }>;
}

// Desk Zone Types
export interface DeskZone {
  zone: string;
  coords: number[][];
  center: [number, number];
  inertia?: number;
}

export interface CameraDesks {
  camera: string;
  ip: string;
  fps: number;
  resolution: [number, number];
  desks: Record<number, DeskZone>;
}

// Bot Command Types
export interface BotCommand {
  command: string;
  description: string;
  handler: (ctx: any) => Promise<void>;
}

// Alert Types
export interface Alert {
  id: string;
  type: 'cell_phone' | 'person' | 'face_detection' | 'motion' | 'custom';
  camera: string;
  desk?: number;
  zone?: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data?: any;
}

// Monitoring Types
export interface MonitoringStats {
  totalEvents: number;
  cellPhoneViolations: number;
  personDetections: number;
  faceRecognitions: number;
  activeCameras: number;
  lastUpdate: number;
}
