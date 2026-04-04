import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@triluga.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'User123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      'A senha deve conter pelo menos uma letra, um número e um caractere especial.',
  })
  password: string;

  @ApiProperty({ example: 'Lucas Almeida' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ example: '+55 11 99999-9999' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: '13010-111' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(9)
  zipCode: string;

  @ApiProperty({ example: 'Rua Conceição' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  addressLine: string;

  @ApiProperty({ example: 'Apto 42' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressComplement?: string;

  @ApiProperty({ example: 'Campinas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  state: string;
}
