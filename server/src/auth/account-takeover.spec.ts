import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

function makeUser(over: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'victim@example.com',
    passwordHash: 'hash-set-by-attacker',
    name: null,
    locale: null,
    sessionsValidAfter: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function serviceWith(user: User | null) {
  const save = jest.fn().mockImplementation((u: User) => Promise.resolve(u));
  const repo = {
    findOne: jest.fn().mockResolvedValue(user),
    save,
  } as unknown as Repository<User>;
  return { service: new UsersService(repo), save };
}

describe('Google sign-in on a password account (pre-hijack defence)', () => {
  it('drops the password and revokes older sessions', async () => {
    const user = makeUser();
    const { service, save } = serviceWith(user);
    const before = Date.now();
    const safe = await service.upsertOAuthUser('victim@example.com', 'Victim');
    expect(user.passwordHash).toBeNull();
    expect(user.sessionsValidAfter!.getTime()).toBeGreaterThanOrEqual(before);
    expect(save).toHaveBeenCalledTimes(1);
    expect(safe).not.toHaveProperty('passwordHash');
  });

  it('leaves a Google-only account alone', async () => {
    const user = makeUser({ passwordHash: null, name: 'Has name' });
    const { service, save } = serviceWith(user);
    await service.upsertOAuthUser('victim@example.com', 'Victim');
    expect(user.sessionsValidAfter).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});

describe('JwtStrategy.validate', () => {
  const now = Math.floor(Date.now() / 1000);

  it('rejects tokens issued before sessionsValidAfter', async () => {
    const user = makeUser({ sessionsValidAfter: new Date(now * 1000) });
    const strategy = new JwtStrategy(serviceWith(user).service);
    await expect(
      strategy.validate({ sub: 1, email: user.email, iat: now - 60 }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a token issued in the same second as the revocation', async () => {
    const user = makeUser({ sessionsValidAfter: new Date(now * 1000 + 500) });
    const strategy = new JwtStrategy(serviceWith(user).service);
    await expect(
      strategy.validate({ sub: 1, email: user.email, iat: now }),
    ).resolves.toEqual({ sub: 1, email: user.email });
  });

  it('rejects tokens of deleted users', async () => {
    const strategy = new JwtStrategy(serviceWith(null).service);
    await expect(
      strategy.validate({ sub: 1, email: 'x@example.com', iat: now }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
