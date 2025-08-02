export interface HPPEntry {
  id: number;
  sku_rep: string;
  hpp: number;
  user_id: number;
}

export interface PaginatedHPPResponse {
  data: HPPEntry[];
  total: number;
}
