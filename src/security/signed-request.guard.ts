import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';

type RequestLike = {
  method: string;
  originalUrl: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody?: Buffer;
};

function header(req: RequestLike, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex');
  const b = Buffer.from(bHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

@Injectable()
export class SignedRequestGuard implements CanActivate {
  constructor(private readonly cfg: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<RequestLike>();
    const secret = this.cfg.get<string>('EDGE_SIGNING_SECRET');
    if (!secret) throw new ForbiddenException('signing is not configured');

    const ts = header(req, 'x-sig-ts');
    const nonce = header(req, 'x-sig-nonce') ?? '';
    const sig = header(req, 'x-sig-hmac');

    if (!ts || !sig) {
      throw new ForbiddenException('missing signature headers');
    }

    const now = Date.now();
    const skew = Math.abs(now - Number(ts));
    if (!Number.isFinite(Number(ts)) || skew > 2 * 60 * 1000) {
      throw new ForbiddenException('signature expired');
    }

    const method = (req.method || 'GET').toUpperCase();
    const pathWithQuery = req.originalUrl || req.url;
    const bodyHash = crypto
      .createHash('sha256')
      .update(req.rawBody ?? Buffer.alloc(0))
      .digest('hex');

    const canonical = [method, pathWithQuery, ts, nonce, bodyHash].join('\n');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(canonical)
      .digest('hex');

    if (!timingSafeEqualHex(expected, sig)) {
      throw new ForbiddenException('invalid signature');
    }
    return true;
  }
}
