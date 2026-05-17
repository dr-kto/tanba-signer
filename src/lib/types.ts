export interface SignatureZone {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Document {
  id: string;
  file_url: string;
  file_name: string;
  status: "draft" | "pending" | "signed";
  signature_zones: SignatureZone[];
  signature_data: string | null;
  created_at: string;
  updated_at: string;
}
