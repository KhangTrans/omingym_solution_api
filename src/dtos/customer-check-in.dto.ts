export interface CustomerCheckInDto {
  branch_id: number;
  dynamic_qr_token?: string;
}

export interface GetCustomerCheckInQueryDto {
  customer_id?: number;
  branch_id?: number;
  date?: string; // YYYY-MM-DD format
}
