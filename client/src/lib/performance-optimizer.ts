export class PerformanceOptimizer {
  private static workers: Map<string, Worker> = new Map();

  static createWebWorker(code: string): Worker {
    const blob = new Blob([code], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    return worker;
  }

  static getWorker(id: string): Worker | undefined {
    return this.workers.get(id);
  }

  static setWorker(id: string, worker: Worker): void {
    this.workers.set(id, worker);
  }

  static terminateWorker(id: string): void {
    const worker = this.workers.get(id);
    if (worker) {
      worker.terminate();
      this.workers.delete(id);
    }
  }

  static terminateAllWorkers(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
  }
} 