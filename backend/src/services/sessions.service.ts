import { v4 as uuidv4 } from 'uuid';
import { SessionsRepository } from '../repositories/sessions.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Session, SessionMode } from '@signbridge/shared';

export class SessionsService {
  constructor(private repo: SessionsRepository = new SessionsRepository()) {}

  async startSession(mode: SessionMode = 'live'): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      mode,
    };
    return this.repo.create(session);
  }

  async endSession(id: string, endedAt?: string): Promise<Session> {
    const finalTime = endedAt || new Date().toISOString();
    const updated = await this.repo.endSession(id, finalTime);
    if (!updated) {
      throw new AppError(`Session '${id}' not found`, 404, 'NOT_FOUND');
    }
    return updated;
  }
}
