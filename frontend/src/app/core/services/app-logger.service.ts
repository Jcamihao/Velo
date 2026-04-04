import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class AppLoggerService {
  private readonly prefix = '[TRILUGA]';

  debug(scope: string, message: string, data?: Record<string, unknown>) {
    this.write('debug', scope, message, data);
  }

  info(scope: string, message: string, data?: Record<string, unknown>) {
    this.write('info', scope, message, data);
  }

  warn(scope: string, message: string, data?: Record<string, unknown>) {
    this.write('warn', scope, message, data);
  }

  error(scope: string, message: string, data?: Record<string, unknown>) {
    this.write('error', scope, message, data);
  }

  private write(
    level: LogLevel,
    scope: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    if (!environment.clientLoggingEnabled) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      scope,
      ...data,
    };

    const line = `${this.prefix} [${scope}] ${message}`;

    if (level === 'error') {
      console.error(line, payload);
      return;
    }

    if (level === 'warn') {
      console.warn(line, payload);
      return;
    }

    if (level === 'debug') {
      console.debug(line, payload);
      return;
    }

    console.info(line, payload);
  }
}
