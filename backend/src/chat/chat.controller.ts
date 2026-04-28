import { Controller, Get, Param, Patch, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';

@ApiTags('chats')
@ApiBearerAuth()
@Controller('chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('vehicle/:vehicleId/start')
  @ApiOperation({
    summary: 'Inicia ou reutiliza uma conversa sobre um veiculo',
  })
  startConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.chatService.startVehicleConversation(user.sub, vehicleId);
  }

  @Get()
  @ApiOperation({ summary: 'Lista conversas do usuario autenticado' })
  listMyConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getMyConversations(user.sub);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Lista mensagens de uma conversa' })
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    const messages = await this.chatService.getConversationMessages(
      user.sub,
      conversationId,
    );
    const result = await this.chatService.markConversationRead(
      user.sub,
      conversationId,
    );

    this.chatGateway.broadcastReadReceipt({
      conversationId,
      readerId: user.sub,
      readAt: result.readAt,
    });

    return messages;
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marca uma conversa como lida' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    const result = await this.chatService.markConversationRead(
      user.sub,
      conversationId,
    );

    this.chatGateway.broadcastReadReceipt({
      conversationId,
      readerId: user.sub,
      readAt: result.readAt,
    });

    return result;
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Envia uma mensagem para a conversa' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    const result = await this.chatService.sendMessage(
      user.sub,
      conversationId,
      dto.content,
    );

    await this.chatGateway.broadcastMessage(result);

    return result.message;
  }
}
