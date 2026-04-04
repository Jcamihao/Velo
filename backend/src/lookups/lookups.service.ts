import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

@Injectable()
export class LookupsService {
  async lookupZipCode(zipCode: string) {
    const digits = String(zipCode ?? '')
      .replace(/\D/g, '')
      .slice(0, 8);

    if (digits.length !== 8) {
      throw new BadRequestException('Informe um CEP válido com 8 dígitos.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new BadGatewayException(
          'Não foi possível consultar o serviço de CEP.',
        );
      }

      const payload = (await response.json()) as ViaCepResponse;

      if (payload.erro) {
        throw new NotFoundException('CEP não encontrado.');
      }

      return {
        zipCode: this.formatZipCode(payload.cep ?? digits),
        addressLine: payload.logradouro?.trim() ?? '',
        city: payload.localidade?.trim() ?? '',
        state: payload.uf?.trim().toUpperCase() ?? '',
        addressComplement: payload.complemento?.trim() ?? '',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }

      throw new BadGatewayException(
        'Não foi possível consultar o serviço de CEP.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private formatZipCode(value: string) {
    const digits = String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, 8);

    if (digits.length <= 5) {
      return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
}
