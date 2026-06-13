import { TrainerLevel } from "../models/trainer-status.enum.js";

export class ApproveTrainerApplicationDto {
  approved_level!: TrainerLevel;
}
