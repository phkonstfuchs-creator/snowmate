import { exportMyDataResponse } from "@/features/profile/account-rights";

export async function GET() {
  return exportMyDataResponse();
}
