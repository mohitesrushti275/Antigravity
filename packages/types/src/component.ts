// ═══════════════════════════════════════════════════
// SHARED COMPONENT TYPES
// packages/types/src/component.ts
// ═══════════════════════════════════════════════════

export type ComponentStatus = "draft" | "on_review" | "posted" | "featured" | "deleted";

export interface Component {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description: string;
  status: ComponentStatus;
  category_id?: string;
  preview_image_key?: string;
  video_key?: string;
  npm_dependencies: string[];
  license: string;
  registry_version: string;
  download_count: number;
  like_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentFile {
  id: string;
  component_id: string;
  demo_id?: string;
  file_type: "component" | "demo" | "css" | "config" | "tailwind";
  r2_key: string;
  filename: string;
  size_bytes: number;
  content_type: string;
  checksum?: string;
  created_at: string;
}

export interface ComponentDemo {
  id: string;
  component_id: string;
  name: string;
  preview_image_key?: string;
  video_key?: string;
  display_order: number;
  created_at: string;
}

export interface ComponentWithAuthor extends Component {
  users?: {
    username: string;
    avatar_url?: string;
  };
  categories?: {
    slug: string;
    name: string;
  };
}

export interface SourceBundle {
  component: FileInfo | null;
  demo: FileInfo | null;
  css: FileInfo | null;
  config: FileInfo | null;
  tailwind: FileInfo | null;
}

interface FileInfo {
  filename: string;
  url: string;
  size: number;
  contentType: string;
}

// Component summary for AI context
export interface ComponentSummary {
  name: string;
  description: string;
  code: string;
}
