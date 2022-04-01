import { JsonRpcProvider } from '@ethersproject/providers';
import {
  multicall as processor,
  Call,
  CallResult,
} from '@reddotlabs/multicall';
import Queue from 'yocto-queue';

type QueueItem = {
  calls: Call[];
  resolve: (p: CallResult[]) => void;
};

const MAX_CONCURRENT = 2;

export class QueuedMulticall {
  private queue: Queue<QueueItem>;
  private activeCount: number = 0;

  constructor(
    private provider: JsonRpcProvider,
    private multicallAddress: string
  ) {
    this.queue = new Queue();
  }

  get depth() {
    return this.queue.size;
  }

  private next = () => {
    if (this.activeCount < MAX_CONCURRENT && this.depth) {
      this.tick();
    }
  };

  private tick = () => {
    this.activeCount++;
    let processCalls: Call[] = [];
    let items = [] as {
      count: number;
      resolve: (r: CallResult[]) => void;
    }[];

    while (this.queue.size > 0 && processCalls.length < 32) {
      const item = this.queue.dequeue();
      if (!item) {
        return;
      }
      const { calls, resolve } = item;
      processCalls = processCalls.concat(calls);
      items.push({
        resolve,
        count: calls.length,
      });
    }

    processor(this.provider, this.multicallAddress, processCalls).then(
      (res: CallResult[]) => {
        let counter = 0;
        for (let i = 0; i < items.length; i++) {
          const { count, resolve } = items[i];
          resolve(res.slice(counter, counter + count));
          counter += count;
        }

        this.activeCount--;
        this.next();
      }
    );
  };

  public enqueue(calls: Call[]) {
    return new Promise<CallResult[]>(resolve => {
      this.queue.enqueue({
        calls,
        resolve,
      });

      // defer to the next microtick
      (async () => {
        if (this.activeCount <= MAX_CONCURRENT) {
          this.tick();
        }
      })();
    });
  }

  public dispose() {
    this.queue.clear();
  }
}
