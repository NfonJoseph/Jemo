import { IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: "Phone number is required" })
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  password!: string;
}
