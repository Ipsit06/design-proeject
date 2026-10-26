import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { env } from '../config/env.js';

export interface SanketTranslationResponse {
  status: 'recognized' | 'uncertain' | 'error';
  translation: string;
  chunks: number;
  provider: 'sanket';
  error?: string;
}

function pythonCommand(): string {
  return env.SANKET_PYTHON;
}

export class SanketService {
  private workerProcess: ReturnType<typeof spawn> | null = null;
  private workerBuffer = '';
  private workerError = '';
  private pending: Array<{
    videoPath: string;
    resolve: (result: SanketTranslationResponse) => void;
  }> = [];

  private ensureWorker(): ReturnType<typeof spawn> {
    if (this.workerProcess && !this.workerProcess.killed) return this.workerProcess;
    const worker = resolve(env.SANKET_WORKER);
    const child = spawn(pythonCommand(), [worker], {
      cwd: dirname(worker),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    this.workerError = '';
    child.stderr.on('data', (data: Buffer) => {
      this.workerError += data.toString();
      if (this.workerError.length > 4000) this.workerError = this.workerError.slice(-4000);
    });
    child.stdout.on('data', (data: Buffer) => {
      this.workerBuffer += data.toString();
      const lines = this.workerBuffer.split(/\r?\n/);
      this.workerBuffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const request = this.pending.shift();
        if (!request) continue;
        try {
          request.resolve(JSON.parse(line) as SanketTranslationResponse);
        } catch {
          request.resolve({
            status: 'error',
            translation: '',
            chunks: 0,
            provider: 'sanket',
            error: 'Sanket worker returned invalid JSON.',
          });
        }
      }
    });
    child.on('error', (error) => {
      const request = this.pending.shift();
      request?.resolve({
        status: 'error',
        translation: '',
        chunks: 0,
        provider: 'sanket',
        error: error.message,
      });
      this.workerProcess = null;
    });
    child.on('exit', (code, signal) => {
      const error = {
        status: 'error' as const,
        translation: '',
        chunks: 0,
        provider: 'sanket' as const,
        error: this.workerError.trim() || `Sanket worker stopped (code=${code ?? 'null'}, signal=${signal ?? 'none'}).`,
      };
      for (const request of this.pending.splice(0)) request.resolve(error);
      this.workerProcess = null;
    });
    this.workerProcess = child;
    return child;
  }

  async translateVideo(videoData: string): Promise<SanketTranslationResponse> {
    const match = videoData.match(/^data:video\/(?:webm|mp4);base64,(.+)$/);
    if (!match) {
      return {
        status: 'error',
        translation: '',
        chunks: 0,
        provider: 'sanket',
        error: 'Expected a base64 WebM or MP4 video data URL.',
      };
    }

    const worker = resolve(env.SANKET_WORKER);
    if (!existsSync(worker)) {
      return {
        status: 'error',
        translation: '',
        chunks: 0,
        provider: 'sanket',
        error: `Sanket worker is missing: ${worker}`,
      };
    }

    const tempDir = resolve(env.SANKET_TEMP_DIR);
    await mkdir(tempDir, { recursive: true });
    const videoPath = resolve(tempDir, `${randomUUID()}.webm`);
    await writeFile(videoPath, Buffer.from(match[1], 'base64'));

    try {
      return await new Promise((resolveResult) => {
        const child = this.ensureWorker();
        this.pending.push({ videoPath, resolve: resolveResult });
        if (!child.stdin) {
          resolveResult({
            status: 'error',
            translation: '',
            chunks: 0,
            provider: 'sanket',
            error: 'Sanket worker stdin is unavailable.',
          });
          return;
        }
        child.stdin.write(`${JSON.stringify({ videoPath })}\n`);
      });
    } finally {
      await rm(videoPath, { force: true });
    }
  }
}
