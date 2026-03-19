import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SendChatMessageDto {
  @ApiProperty({
    description: 'Mensagem enviada para a conversa',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  content: string;
}
