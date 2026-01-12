import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SubmitKycDto {
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @IsString()
  @IsNotEmpty()
  documentUrl!: string;

  @IsString()
  @IsOptional()
  selfieUrl?: string;
}

