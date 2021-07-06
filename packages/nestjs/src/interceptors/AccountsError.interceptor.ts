import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AccountsErrorInterceptor implements NestInterceptor {
  async intercept(_: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    return next
      .handle()
      .pipe(
        catchError(({ message, loginInfo, errorCode = 400 }) =>
          throwError(new HttpException({ message, loginInfo, errorCode }, errorCode)),
        ),
      );
  }
}
