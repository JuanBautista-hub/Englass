export interface UploadResponse {
  id: string;
  title: string;
  fileUrl: string;
  version: number;
  createdAt: string;
}

export interface TemplateSummary {
  id: string;
  title: string;
  version: number;
  deletedAt: string | null;
  createdAt: string;
}