import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

function makeUser(over: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'victim@example.com',
    passwordHash: null,
    name: null,
    locale: null,
    sessionsValidAfter: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function authServiceWith(user: User | null) {
  const deleteMock = jest.fn().mockResolvedValue({ affected: user ? 1 : 0 });
  const repo = {
    findOne: jest.fn().mockResolvedValue(user),
    delete: deleteMock,
  } as unknown as Repository<User>;
  const usersService = new UsersService(repo);
  // Only userId/password matter for deleteAccount; the rest of AuthService's
  // dependencies are never touched by that method.
  const service = new AuthService(
    usersService,
    undefined as never,
    undefined as never,
  );
  return { service, deleteMock };
}

describe('AuthService.deleteAccount', () => {
  it('rejects a missing user', async () => {
    const { service } = authServiceWith(null);
    await expect(service.deleteAccount(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('requires a password for a password account', async () => {
    const hash = await bcrypt.hash('correct-horse', 10);
    const { service, deleteMock } = authServiceWith(
      makeUser({ passwordHash: hash }),
    );
    await expect(service.deleteAccount(1)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password', async () => {
    const hash = await bcrypt.hash('correct-horse', 10);
    const { service, deleteMock } = authServiceWith(
      makeUser({ passwordHash: hash }),
    );
    await expect(
      service.deleteAccount(1, 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('deletes a password account on the correct password', async () => {
    const hash = await bcrypt.hash('correct-horse', 10);
    const { service, deleteMock } = authServiceWith(
      makeUser({ passwordHash: hash }),
    );
    await service.deleteAccount(1, 'correct-horse');
    expect(deleteMock).toHaveBeenCalledWith({ id: 1 });
  });

  it('deletes a Google-only account without a password', async () => {
    const { service, deleteMock } = authServiceWith(
      makeUser({ passwordHash: null }),
    );
    await service.deleteAccount(1);
    expect(deleteMock).toHaveBeenCalledWith({ id: 1 });
  });
});
