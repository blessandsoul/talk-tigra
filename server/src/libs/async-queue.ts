/**
 * Async Queue with Concurrency Control
 *
 * Improvement #2: Rate-limited queue for n8n requests
 * Ensures we don't flood n8n with too many parallel requests
 */

import logger from './logger.js';

interface QueueTask<T> {
    fn: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: any) => void;
}

export class AsyncQueue {
    private queue: QueueTask<any>[] = [];
    private running = 0;
    private concurrency: number;
    private delayMs: number;

    /**
     * Create a new async queue
     * 
     * @param concurrency - Maximum number of concurrent tasks (default: 3)
     * @param delayMs - Delay between task starts in ms (default: 500)
     */
    constructor(concurrency = 3, delayMs = 500) {
        this.concurrency = concurrency;
        this.delayMs = delayMs;
    }

    /**
     * Add a task to the queue
     * Returns a promise that resolves when the task completes
     */
    async add<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }

    private async process(): Promise<void> {
        if (this.running >= this.concurrency || this.queue.length === 0) {
            return;
        }

        const task = this.queue.shift();
        if (!task) return;

        this.running++;

        try {
            // Add delay to prevent rate limiting
            if (this.delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, this.delayMs));
            }

            const result = await task.fn();
            task.resolve(result);
        } catch (error) {
            task.reject(error);
        } finally {
            this.running--;
            this.process(); // Process next item
        }
    }

    /**
     * Get queue statistics
     */
    stats() {
        return {
            pending: this.queue.length,
            running: this.running,
            concurrency: this.concurrency,
        };
    }
}

/**
 * Singleton queue for n8n requests
 * - Max 3 concurrent requests
 * - 500ms delay between requests
 */
export const n8nQueue = new AsyncQueue(3, 500);

logger.info({ concurrency: 3, delayMs: 500 }, 'n8n request queue initialized');
